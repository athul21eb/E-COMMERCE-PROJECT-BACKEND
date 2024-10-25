import expressAsyncHandler from "express-async-handler";
import Products from "../../../models/products/products-model.js";
import Order from "../../../models/order/order-model.js";
import Cart from "../../../models/cart/cart-model.js";
import mongoose from "mongoose";
import crypto from 'crypto'
import { Coupon } from "../../../models/coupons/coupons-model.js";
import { razorPay } from "../../../config/razorpay.js";

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
    } else {
      cart.appliedCoupon = null;
      await cart.save();
    }
  }

  switch (paymentMethod) {
    /////------PayOnDelivery--------
    case "PayOnDelivery":
      // Check if the bill amount exceeds ₹1000
      // if (billAmount > 1000) {
      //   res.status(400);
      //   throw new Error("Cash on Delivery is not available for purchases of ₹1000 or more");
      // }

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
       
        payment:{
          method:"PayOnDelivery",
          status:"Pending",
        },
        OrderStatus: "Confirmed",
        appliedCouponAmount: parseInt(appliedCouponAmount),
      });

      if (order) {
        //  if there is in coupon put user id in usage history
        if (appliedCouponAmount && cart.appliedCoupon?.code) {
          await Coupon.findOneAndUpdate(
            {
              code: cart.appliedCoupon?.code,
            },
            {
              $push: { usageRecords: { user: userId, usedAt: currentDate } },
            }
          );
        }

        // Clear the user's cart after the order is successfully placed
        await Cart.findOneAndUpdate(
          { user: userId },
          { $set: { items: [], appliedCoupon: null } }
        );

        // Decrease the product stock for each item in the order
        for (const item of verifiedItems) {
          await Products.findOneAndUpdate(
            { _id: item.productId, "stock.size": item.size },
            { $inc: { "stock.$.stock": -item.quantity } },
            { runValidators: true }
          );
        }

        // Respond with success message
        return res.status(200).json({
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
        const paymentOrder = await razorPay.orders.create({
          amount:billAmount*100,
          currency:"INR",
          receipt:crypto.randomUUID()

        })
        // Create the order with the provided details
       const orderr = await Order.create({
        userId,
        
        items: verifiedItems,
        billAmount: billAmount,
        shippingAddress,
        payment:{
          status:"Pending",
          method:"RazorPay",
          transactionId:crypto.randomUUID(),
          gateway_order_id:paymentOrder.id
        },
        OrderStatus: "Initiated",
        appliedCouponAmount: parseInt(appliedCouponAmount),
      });
      

       res.status(200).json(paymentOrder);

      break;

    /////------Wallet--------
    case "Wallet":
      res.status(200).json({
        message: `Order placed successfully with ${paymentMethod}`,
      });
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

export const verifyPayment = expressAsyncHandler(async(req,res)=>{

  
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, error } = req.body

  if(error){
      const order = await Order.findOneAndDelete({'payment.gateway_order_id':error.metadata._id});
      res.status(400);
      throw new Error (`Failed to place the order due to payment failure ,please try again`);
    // const order = await Order.findOne({'payment.gateway_order_id':error.metadata._id});
    // order.orderStatus = 'Failed';
    // order.payment.status = 'Failed';
    // order.payment.method = 'RazorPay'
    // const {items} = order;
    // for(const item of items){
    //   item.status = "Failed";
    // }
    // await order.save();
    // res.status(400);
    // throw new Error(`'Failed to place the order due to payment failure ,please try again'`)
  }

  const generateSignature = crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET).update(razorpay_order_id+'|'+razorpay_payment_id).digest("hex");
  if(generateSignature===razorpay_signature){
    const order = await Order.findOne({ "payment.gateway_order_id": razorpay_order_id })
    
    .populate("items.productId");
    console.log(order);

    const { items } = order
            const bulkOps = items.map((item) => ({
                updateOne: {
                    filter: { _id: item.productId._id, 'stock.size': item.size },
                    update: { $inc: { 'stock.$.stock': -item.quantity} },
                    options: { runValidators: true }
                }
            }))

            if (bulkOps.length > 0) {
             await Products.bulkWrite(bulkOps)
            
              if (order.status !== 'Failed') {
                  await Cart.findOneAndUpdate({
                      user: req.user.id,
                  }, {
                      $set: { items: [] }
                  })
              }
              
          }

           await razorPay.payments.fetch(razorpay_payment_id)
          order.status = 'Confirmed'
          order.items.forEach(product => {
              product.status = 'Confirmed'
          })
          order.payment.status = 'Success'
          order.payment.method = 'RazorPay';
          await order.save()
          const { _id, ...updateOrder } = order.toObject()
          return res.status(200).json({ message: 'Payment verified successfully', order:updateOrder })
      } else {
           res.status(400)
           throw new Error(`Failed to verify your payment`);
      }

});

// -------------------------------route => GET/v1/orders/user-orders----------------------------------------------
// /* @desc   Get all orders for a specific user
// /* @access Private

export const getOrderData = expressAsyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 10; // Default to 10 orders per page if not provided
    const skip = (page - 1) * limit;

    console.log(userId);
    // Fetch paginated orders for the user
    const orders = await Order.find({ userId: userId })
      .populate({
        path: "items.productId",
        populate: [
          { path: "brand" },
          { path: "category" }, // Assuming your Product model has a category field
        ],
      })
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
  try {
    const id = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    console.log(id);
    const order = await Order.findById(id.toString()).populate({
      path: "items.productId",
      populate: [
        { path: "brand" },
        { path: "category" }, // Assuming your Product model has a category field
      ],
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order fetched successfully", order });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ message: error.message });
  }
});

// -------------------------------route => PATCH/v1/orders/:orderId/items/:itemId/cancel----------------------------------------------
///* @desc   Cancel an item and return the stock back to inventory
///? @access Private

export const cancelOrderItem = expressAsyncHandler(async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const userId = req.user.id;

    // Find the order by ID and ensure it belongs to the logged-in user
    const order = await Order.findOne({ _id: orderId, userId: userId });
    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found or you don't have permission" });
    }

    // Find the specific item within the order
    const item = order.items.find((item) => item._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in the order" });
    }

    // Check if the item is already cancelled
    if (item.status === "Cancelled") {
      return res.status(400).json({ message: "Item is already cancelled" });
    }

    // Set the status to "Cancelled" and update the cancellation date
    item.status = "Cancelled";
    item.cancelledDate = new Date();

    // Find the product and restore the stock
    const product = await Products.findById(item.productId);
    if (!product) {
      return res
        .status(404)
        .json({ message: `Product not found: ${item.productId}` });
    }

    // Find the size index and add the quantity back to stock
    const sizeIndex = product?.stock.findIndex(
      (size) => size.size === item.size
    );
    if (sizeIndex === -1) {
      return res.status(400).json({
        message: `Size ${item.size} not available for product ${product.name}`,
      });
    }

    product.stock[sizeIndex].stock += item.quantity; // Add back the quantity to stock
    await product.save(); // Save the product with the updated stock

    // Update the order status using the method from the schema
    await order.updateOrderStatus();

    res.status(200).json({
      message: "Item cancelled successfully and stock restored",
      order,
    });
  } catch (error) {
    console.error("Error cancelling item:", error);
    res.status(500).json({ message: "Failed to cancel item" });
  }
});
