import expressAsyncHandler from "express-async-handler";
import Products from "../../../models/products/products-model.js";
import Order from "../../../models/order/order-model.js";
import Cart from "../../../models/cart/cart-model.js";
import mongoose from "mongoose";
import crypto from "crypto";
import { v4 } from "uuid";
import Wallet from "../../../models/wallet/wallet-model.js";
import { Coupon } from "../../../models/coupons/coupons-model.js";
import { razorPay } from "../../../config/razorpay.js";
import { processRefund } from "../../../utils/helper/refundToWallet.js";
import { restoreProductStock } from "../../../utils/helper/productRestock.js";
import ReturnOrderModel from "../../../models/returnOrder/return-order-model.js";
import processOrderPostPlacement from "../../../utils/helper/postOrderUpdates.js";

// //-------------------------------route => POST/v1/orders/create----------------------------------------------
///* @desc   Create a new order
///? @access Private

export const createOrder = expressAsyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;
  const userId = req.user.id;

  const validPaymentMethods = ["RazorPay", "PayOnDelivery", "Wallet"];
  if (!validPaymentMethods.includes(paymentMethod)) {
    res.status(400);
    throw new Error("Payment method not valid");
  }

  const cart = await Cart.findOne({ user: userId })
    .populate({
      path: "appliedCoupon",
      select:
        "code discount expirationDate maxDiscountAmount minPurchaseAmount",
    })
    .populate({
      path: "items.productId",
      populate: [
        { path: "offer" }, // Assuming you have an offer field you want to populate
      ],
    });

  if (!cart || !cart.items.length) {
    res.status(404);
    throw new Error("Not Cart found for this user ");
  }

  const CartItems = cart?.items;

  let billAmount = 0;

  const verifiedItems = [];
  const productsIds = CartItems.map((item) => {
    return new mongoose.Types.ObjectId(item.productId._id);
  });
  const isActiveProducts = await Products.aggregate([
    {
      $match: {
        deletedAt: { $exists: false }, // Not soft-deleted
        isActive: true, // Only active products

        _id: { $in: productsIds }, // Exclude the current product
      },
    },
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brand",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $lookup: {
        from: "offers",
        localField: "offer",
        foreignField: "_id",
        as: "offer",
      },
    },
    { $unwind: "$brand" },
    { $unwind: "$category" },
    { $unwind: { path: "$offer", preserveNullAndEmptyArrays: true } },
    {
      $match: {
        "brand.isActive": true, // Ensure the brand is active
        "category.isActive": true, // Ensure the category is active
      },
    },
  ]);

  // if(isActiveProducts){
  //  return res.status( 200).json({isActiveProducts,CartItems})
  // }

  if (!isActiveProducts) {
    await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });
    res.status(404);
    throw new Error(` the products is not Found or is  inActive `);
  }
  const productMap = isActiveProducts.reduce((acc, product) => {
    acc[product._id] = product;
    return acc;
  }, {});

  const currentDate = new Date();

  //// Verify cart items
  for (const item of CartItems) {
    const product = productMap[item.productId._id];
    if (!product) {
      await Cart.findOneAndUpdate(
        { user: userId },
        { $pull: { items: { productId: item.productId } } }
      );
      res.status(404);
      throw new Error(
        ` the product ${item.productId.productName} is not Found or is  inActive `
      );
    }

    const sizeQtyMap = product.stock.reduce((acc, { size, stock }) => {
      acc[size] = stock;
      return acc;
    }, {});

    if (item.quantity < 1 || item.quantity > sizeQtyMap[item.size]) {
      //quantity availability check for items
      const response = await Cart.findOneAndUpdate(
        { user_id: userId, "items.productId": item.productId },
        { $pull: { items: { productId: item.productId } } },
        { new: true, runValidators: true }
      );
      if (response)
        return res.status(400).json({
          message: `Requested product ${product.name} is currently out of stock or not have required stock`,
          type: "stockError",
          itemId: item.productId,
        });
    }

    // Destructure necessary fields from the item
    const { quantity = 1, size } = item; // Default quantity to 1 if not defined
    const {
      _id,
      offer,
      salePrice = 0,
      offerPrice = salePrice,
    } = item.productId;

    // Determine if the offer is valid and active
    const hasOffer = offer?.startDate && offer?.endDate;
    const isOfferActive =
      hasOffer &&
      new Date(offer.startDate) <= currentDate &&
      new Date(offer.endDate) >= currentDate;

    // Calculate the applicable price and discount
    const applicablePrice = isOfferActive ? offerPrice : salePrice;
    const discountAmount = isOfferActive
      ? (salePrice - offerPrice) * quantity
      : 0;

    // Calculate the total price for the item
    const itemTotalPrice = applicablePrice * quantity;
    billAmount += itemTotalPrice;
    const offerDiscountAmount = discountAmount;

    verifiedItems.push({
      productId: _id,
      quantity,
      size,

      unitPrice: salePrice,
      itemTotalPrice,
      appliedOfferAmount: offerDiscountAmount,
      status: "Pending",
    });
  }

  let appliedCouponAmount = 0;
  let couponDetails = null;

  if (cart.appliedCoupon?.code) {
    const coupon = await Coupon.findOne({
      code: cart.appliedCoupon?.code,
      status: "active", // Ensure coupon is active
      expirationDate: { $gt: currentDate },
      usageRecords: {
        $not: { $elemMatch: { user: userId } }, // Check if the user has not used the coupon
      },
    });

    if (
      coupon &&
      coupon.minPurchaseAmount <= billAmount &&
      coupon?.expirationDate &&
      new Date(coupon.expirationDate) > currentDate
    ) {
      const calculatedCouponDiscount = Math.ceil(
        billAmount * (coupon.discount / 100)
      );

      appliedCouponAmount = Math.min(
        calculatedCouponDiscount,
        coupon.maxDiscountAmount
      );
      billAmount -= appliedCouponAmount;

      couponDetails = (({
        discount,
        maxDiscountAmount,
        minPurchaseAmount,
        code,
      }) => ({ discount, maxDiscountAmount, minPurchaseAmount, code }))(coupon);

      await Coupon.findOneAndUpdate(
        {
          code: cart.appliedCoupon?.code,
          status: "active", // Ensure coupon is active
          expirationDate: { $gt: currentDate },
          usageRecords: {
            $not: { $elemMatch: { user: userId } }, // Check if the user has not used the coupon
          },
        },
        {
          $push: { usageRecords: { user: userId, usedAt: new Date() } }, // Corrected $push syntax
        }
      );
    } else {
      cart.appliedCoupon = null;
      await cart.save();
    }
  }

  switch (paymentMethod) {
    /////------PayOnDelivery--------
    case "PayOnDelivery":
      // Check if the bill amount exceeds ₹1000
      if (billAmount > 1000) {
        res.status(400);
        throw new Error(
          "Cash on Delivery is not available for purchases of ₹1000 or more"
        );
      }

      // Update the status of verified items to "Confirm"
      for (const item of verifiedItems) {
        item.status = "Confirmed";
      }

      // Create the order with the provided details
      const order = await Order.create({
        userId,
        items: verifiedItems,
        billAmount: billAmount,
        shippingAddress,

        payment: {
          method: "PayOnDelivery",
          status: "Pending",
        },
        orderStatus: "Confirmed",
        appliedCouponAmount: parseInt(appliedCouponAmount),
        ...(couponDetails && { couponDetails }),
      });

      if (order) {

        await processOrderPostPlacement(order,userId,res);


        // Respond with success message
        res.status(200).json({
          message: `Order placed successfully with ${paymentMethod}`,
          order,
        });
      } else {
        // Handle order creation failure
        res.status(400);
        throw new Error("Failed to place order");
      }

      break;

    /////------RazorPay--------
    case "RazorPay":
      const RazorPayTxnId = v4();
      const paymentOrder = await razorPay.orders.create({
        amount: billAmount * 100,
        currency: "INR",
        receipt: RazorPayTxnId,
      });
      // Create the order with the provided details
      await Order.create({
        userId,

        items: verifiedItems,
        billAmount: billAmount,
        shippingAddress,
        payment: {
          status: "Pending",
          method: "RazorPay",
          transactionId: RazorPayTxnId,
          gateway_order_id: paymentOrder.id,
        },
        orderStatus: "Initiated",
        appliedCouponAmount: parseInt(appliedCouponAmount),
        ...(couponDetails && { couponDetails }),
      });

      res.status(200).json(paymentOrder);

      break;

    /////------Wallet--------
    case "Wallet":
      const wallet = await Wallet.findOne({ user_id: userId });
      if (!wallet) {
        res.status(400);
        throw new Error(`Create a Wallet First !`);
      }

      if (wallet.balance < billAmount) {
        res.status(400);
        throw new Error(
          `Wallet balance - ₹${wallet.balance} lower than TotalPrice- ₹${billAmount} !`
        );
      }

      // Update the status of verified items to "Confirm"
      for (const item of verifiedItems) {
        item.status = "Confirmed";
      }

      const walletTxnId = v4();
      const orderByWallet = await Order.create({
        userId,
        items: verifiedItems,
        billAmount,
        shippingAddress,
        payment: {
          method: "Wallet",
          status: "Success",
          transactionId: walletTxnId,
        },
        orderStatus: "Confirmed",
        appliedCouponAmount: parseInt(appliedCouponAmount),
        ...(couponDetails && { couponDetails }),
      });

      if (orderByWallet) {
        wallet.transactions.push({
          amount: billAmount,
          transaction_id: walletTxnId,
          status: "success",
          type: "debit",
          description: `payment for orderId : ${orderByWallet.orderId}`,
        });
        wallet.balance -= billAmount;
        await wallet.save();

        await processOrderPostPlacement(orderByWallet,userId,res);

        // Respond with success message
        res.status(200).json({
          message: `Order placed successfully with ${paymentMethod}`,
          order: orderByWallet,
        });
      } else {
        // Handle order creation failure
        res.status(400);
        throw new Error("Failed to place order");
      }

      break;

    // Add other cases for different payment methods if necessary

    default:
      res.status(400);
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
  }
});

// //-------------------------------route => POST/v1/orders/verify-payment----------------------------------------------
///* @desc   verify payment
///? @access Private

export const verifyPayment = expressAsyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, error } =
    req.body;

  if (error) {
    // const order = await Order.findOneAndDelete({'payment.gateway_order_id':error.metadata._id});
    // res.status(400);
    // throw new Error (`Failed to place the order due to payment failure ,please try again`);
    const order = await Order.findOne({
      "payment.gateway_order_id": error.metadata.order_id,
    });
    order.orderStatus = "Failed";
    order.payment.status = "Failed";
    order.payment.method = "RazorPay";
    const { items } = order;
    for (const item of items) {
      item.status = "Failed";
    }
    await order.save();
    await Cart.findOneAndUpdate(
      {
        user: req.user.id,
      },
      {
        $set: { items: [] },
      }
    );
    res.status(400);
    throw new Error(
      `'Failed to place the order due to payment failure ,please try again'`
    );
  }

  const generateSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");
  if (generateSignature === razorpay_signature) {
    const order = await Order.findOne({
      "payment.gateway_order_id": razorpay_order_id,
    }).populate("items.productId");

    const { items } = order;
    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item.productId._id, "stock.size": item.size },
        update: { $inc: { "stock.$.stock": -item.quantity } },
        options: { runValidators: true },
      },
    }));

    if (bulkOps.length > 0) {
      await Products.bulkWrite(bulkOps);

      if (order.status !== "Failed") {
        await Cart.findOneAndUpdate(
          {
            user: req.user.id,
          },
          {
            $set: { items: [] },
          }
        );
      }
    }

    const paymentDetails = await razorPay.payments.fetch(razorpay_payment_id);

    order.orderStatus = "Confirmed";
    order.items.forEach((product) => {
      product.status = "Confirmed";
    });
    order.payment.status = "Success";
    order.payment.method = "RazorPay";
    await order.save();

    const { _id, ...updateOrder } = order.toObject();
    return res
      .status(200)
      .json({ message: "Payment verified successfully", order: updateOrder });
  } else {
    res.status(400);
    throw new Error(`Failed to verify your payment`);
  }
});

//// -------------------------------route => GET/v1/orders/user-orders----------------------------------------------
// /* @desc   Get all orders for a specific user
// /* @access Private

export const getOrderData = expressAsyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 10; // Default to 10 orders per page if not provided
    const skip = (page - 1) * limit;

  
    // Fetch paginated orders for the user
    const orders = await Order.find(
      {
        userId: userId,
        orderStatus: { $ne: "Initiated" },
      },
      { _id: false }
    )
      .populate({
        path: "items.productId",
        populate: [
          { path: "brand" },
          { path: "category" }, // Assuming your Product model has a category field
        ],
      })
      .sort({ createdAt: -1 }) // Sort by `createdAt` in descending order (latest first)
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments({ userId: userId });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found for this user" });
    }

    res.status(200).json({
      message: "Orders retrieved successfully",
      orders,
      totalOrders,
    });
  } catch (error) {
    console.error("Error retrieving orders:", error);
    res.status(500).json({ message: error.message });
  }
});

// -------------------------------route => GET/v1/orders/:id----------------------------------------------
///* @desc   Get order details by ID
///? @access Private
export const getUserOrderDetailsById = expressAsyncHandler(async (req, res) => {
  const id = req.params.id;

  const order = await Order.findOne({ orderId: id }, { _id: false }).populate({
    path: "items.productId",
    populate: [
      { path: "brand" },
      { path: "category" }, // Assuming your Product model has a category field
    ],
  });

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  res.status(200).json({ message: "Order fetched successfully", order });
});

//// -------------------------------route => PATCH/v1/orders/:orderId/items/:itemId/cancel----------------------------------------------
///* @desc   Cancel an item and return the stock back to inventory
///? @access Private
export const cancelOrderItem = expressAsyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params;
  if (!orderId || !itemId) {
    res.status(400);
    throw new Error(`orderId and itemId is required`);
  }

  const userId = req.user.id;

  // Find the order by ID and ensure it belongs to the logged-in user
  const order = await Order.findOne({ orderId: orderId, userId: userId });
  if (!order) {
    res.status(404);
    throw new Error("Order not found or you don't have permission");
  }

  // Find the specific item within the order
  const item = order.items.find((item) => item._id.toString() === itemId);
  if (!item) {
    res.status(404);
    throw new Error("Item not found in the order");
  }

  // Check if the item is already cancelled
  if (["Shipped", "Delivered", "Cancelled"].includes(item.status)) {
    res.status(400);
    throw new Error("Item Can not Cancel due to current status");
  }


  // Set the status to "Cancelled" and update the cancellation date
  item.status = "Cancelled";
  item.cancelledDate = new Date();
  // Process refund if applicable
  await processRefund(
    order,
    item,
    userId,
    `Refund for cancellation of item in order: ${order.orderId}`
  );

  // Save the order with the updated item status
  await order.save();

  // Restore the product stock
  await restoreProductStock(item.productId, item.size, item.quantity); // Save the product with the updated stock

  res.status(200).json({
    message: `Item cancelled successfully and ${
      order.payment.method !== "PayOnDelivery"
        ? "Amount Refunded to your wallet"
        : ""
    }`,
    order,
  });
});

//// -------------------------------route => PATCH/v1/orders/:orderId/items/:itemId/return----------------------------------------------
///* @desc   return  an item and return the stock back to inventory
///? @access Private

export const returnOrderItem = expressAsyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params;
  const { reason, remarks } = req.body;
  if (!orderId || !itemId || !reason) {
    res.status(400);
    throw new Error(`OrderId ,reason and ItemId is required`);
  }
  const validReasons = [
    "Product arrived damaged or defective",
    "Incorrect item received",
    "Product does not match description",
    "Changed mind after purchase",
    "Product does not fit as expected",
    "Other Reason",
  ];

  if (!validReasons.includes(reason)) {
    res.status(400);
    throw new Error("Enter a valid Reason for return");
  }

  if (reason === "Other Reason" && !remarks) {
    res.status(400);
    throw new Error("Other Reason must have a remarks for return");
  }

  const userId = req.user.id;

  const order = await Order.findOne({ orderId: orderId, "items._id": itemId });

  if (!order) {
    res.status(400);
    throw new Error(`Order not Found `);
  }

  const item = order.items.id(itemId);
  if (!item) {
    res.status(400);
    throw new Error("Item not found in the Order ");
  }

  const existingReturnOrder = await ReturnOrderModel.findOne({
    orderId: order._id,
    itemId: itemId,
    userId: userId,
  });
  if (existingReturnOrder) {
    res.status(400);
    throw new Error("Return Order Already Requested, In Processing");
  }

  await ReturnOrderModel.create({
    orderId: order._id,
    userId,
    productId: item.productId,
    itemId: item._id,
    reason,
    remarks,
    status: "requested",
  });

  await Order.findOneAndUpdate(
    {
      orderId,
      userId,
      "items._id": itemId,
    },
    {
      $set: {
        "items.$.status": "Return Requested",
      },
    }
  );

  res.status(201).json({ message: "order return requested successfully" });
});

// //-------------------------------route => POST/v1/orders/retry-payment/:orderId----------------------------------------------
///* @desc   retry payment
///? @access Private


export const retryPayment = expressAsyncHandler(async (req, res) => {
  const { retryMethod, shippingAddress } = req.body;
  const { orderId } = req.params;


  if (!retryMethod || !orderId) {
    res.status(400);
    throw new Error(`retryPaymentMethod and orderId is required`);
  }

  const validPaymentMethods = ["RazorPay", "PayOnDelivery", "Wallet"];
  if (!validPaymentMethods.includes(retryMethod)) {
    res.status(400);
    throw new Error("Payment method not valid");
  }

  const userId = req.user.id; // Extract user ID
  
  const order = await Order.findOne({ orderId,userId }).populate("items.productId");
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const billAmount = order.billAmount; // Get the bill amount from the order
 

  if (order.orderStatus !== "Failed") {
    res.status(400);
    throw new Error("Only failed orders can be retried");
  }

  if (shippingAddress) {
    order.shippingAddress = shippingAddress;
  }

  order.orderDate = new Date();
  //// -------- Razorpay --------
  if (retryMethod === "RazorPay") {
    try {
      const RazorPayTxnId = v4();
      const paymentOrder = await razorPay.orders.create({
        amount: billAmount * 100,
        currency: "INR",
        receipt: RazorPayTxnId,
      });

      order.payment = {
        status: "Pending",
        method: "RazorPay",
        transactionId: RazorPayTxnId,
        gateway_order_id: paymentOrder.id,
      };
      order.orderStatus = "Initiated";
      await order.save();

      return res.status(200).json(paymentOrder);
    } catch (error) {
      res.status(500);
      throw new Error("Failed to create Razorpay order");
    }
  }

  //// -------- Wallet --------
  if (retryMethod === "Wallet") {
    const wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) {
      res.status(400);
      throw new Error(`Create a Wallet First!`);
    }

    if (wallet.balance < billAmount) {
      res.status(400);
      throw new Error(
        `Wallet balance - ₹${wallet.balance} lower than TotalPrice - ₹${billAmount}!`
      );
    }

    order.items.forEach((item) => {
      item.status = "Confirmed";
    });

    const walletTxnId = v4();

    order.payment = {
      status: "Success",
      method: "Wallet",
      transactionId: walletTxnId,
    };
    order.orderStatus = "Confirmed";

    const orderByWallet = await order.save();

    if (orderByWallet) {
      wallet.transactions.push({
        amount: billAmount,
        transaction_id: walletTxnId,
        status: "success",
        type: "debit",
        description: `payment for orderId: ${order.orderId}`,
      });
      wallet.balance -= billAmount;
      await wallet.save();
      await processOrderPostPlacement(order, userId, res);

      return res.status(200).json({
        message: `Order placed successfully with ${retryMethod}`,
        order: orderByWallet,
      });
    } else {
      res.status(400);
      throw new Error("Failed to place order");
    }
  }

  //// -------- Pay-on-Delivery --------
  if (retryMethod === "PayOnDelivery") {
    if (order.totalAmount > 1000) {
      res.status(400);
      throw new Error(
        "Pay-on-Delivery is only available for orders under ₹1000"
      );
    }

    order.items.forEach((item) => {
      item.status = "Confirmed";
    });

    order.payment = {
      status: "Pending",
      method: "PayOnDelivery",
    };
    order.orderStatus = "Confirmed";

    const orderByPayOnDelivery = await order.save();

    if (orderByPayOnDelivery) {
      await processOrderPostPlacement(order, userId, res);

      return res.status(200).json({
        message: `Order placed successfully with ${retryMethod}`,
        order: orderByPayOnDelivery,
      });
    } else {
      res.status(400);
      throw new Error("Failed to place order");
    }
  }

  res.status(400);
  throw new Error("Invalid retry method");
});
