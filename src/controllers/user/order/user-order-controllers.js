import expressAsyncHandler from "express-async-handler";
import Products from "../../../models/products/products-model.js";
import Order from "../../../models/order/order-model.js";
import Cart from "../../../models/cart/cart-model.js";
import mongoose from "mongoose";
import { populate } from "dotenv";


// //-------------------------------route => POST/v1/orders/create----------------------------------------------
///* @desc   Create a new order
///? @access Private

export const createOrder = expressAsyncHandler(async (req, res) => {
  const { items, shippingAddress, paymentMethod, billAmount, discount } = req.body;
  const userId = req.user.id;

  if (!items || !shippingAddress || !paymentMethod || !billAmount) {
    throw new Error("Please fill in all fields");
  }

  try {
    // Check if cart exists and validate stock for each item in the cart
    const cart = await Cart.findOne({ user: userId }).populate("items.productId");

    if (!cart) {
      throw new Error("Cart not found for the user.");
    }

    for (let cartItem of cart.items) {
      const product = await Products.findById(cartItem.productId);

      if (!product) {
        throw new Error(`Product not found in the cart: ${cartItem.productId}`);
      }

      const sizeIndex = product.stock.findIndex((size) => size.size === cartItem.size);
      if (sizeIndex === -1) {
        throw new Error(`Size ${cartItem.size} not available for product ${product.name}`);
      }

      if (product.stock[sizeIndex].stock < cartItem.quantity) {
        throw new Error(`Insufficient stock for product ${product.productName} in size ${cartItem.size}. Available stock: ${product.stock[sizeIndex].stock}`);
      }
    }

    // Create and save the order only after validating the stock
    const newOrder = new Order({
      userId,
      items,
      billAmount,
      shippingAddress,
      paymentMethod,
      discount,
    });

    const savedOrder = await newOrder.save();
    if (!savedOrder) {
      throw new Error("Failed to save the order");
    }

    // Adjust stock for each item in the order request
    for (let item of items) {
      const product = await Products.findById(item.productId);
      const sizeIndex = product.stock.findIndex((size) => size.size === item.size);

      // Reduce stock after order confirmation
      product.stock[sizeIndex].stock -= item.quantity;
      await product.save();
    }

    // Clear the cart after order is successfully placed
    await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } }, { new: true });

    res.status(201).json({
      message: "Order confirmed successfully",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Error confirming order:", error);
    res.status(500).json({ message: error.message });
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

    console.log(userId)
    // Fetch paginated orders for the user
    const orders = await Order.find({ userId: userId })
    .populate({
      path: "items.productId",
      populate: [
        { path: "brand" },
        { path: "category" } // Assuming your Product model has a category field
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
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    console.log(id);
    const order = await Order.findById(id.toString()).populate({
      path: "items.productId",
      populate:  [
        { path: "brand" },
        { path: "category" } // Assuming your Product model has a category field
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
      return res.status(404).json({ message: "Order not found or you don't have permission" });
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
      return res.status(404).json({ message: `Product not found: ${item.productId}` });
    }

    // Find the size index and add the quantity back to stock
    const sizeIndex = product?.stock.findIndex((size) => size.size === item.size);
    if (sizeIndex === -1) {
      return res.status(400).json({ message: `Size ${item.size} not available for product ${product.name}` });
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
