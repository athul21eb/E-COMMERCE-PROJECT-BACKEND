import expressAsyncHandler from "express-async-handler";
import Products from "../../../models/products/products-model.js";
import Order from "../../../models/order/order-model.js";
import Cart from "../../../models/cart/cart-model.js";
// -------------------------------route => POST/v1/orders/create----------------------------------------------
///* @desc   Create a new order
///? @access Private

export const createOrder = expressAsyncHandler(async (req, res) => {
  const { items, shippingAddress, paymentMethod, BillAmount, discount } =
    req.body;
  const userId = req.user.id;

  if (!items || !shippingAddress || !paymentMethod || !BillAmount) {
    return res.status(400).json({ message: "Please fill in all fields" });
  }

  try {
    // Validate and adjust stock for each item
    for (let item of items) {
      const product = await Products.findById(item.productId);

      if (!product) {
        return res
          .status(404)
          .json({ message: `Product not found: ${item.productId}` });
      }

      const sizeIndex = product?.stock.findIndex(
        (size) => size.size === item.size
      );

      if (sizeIndex === -1) {
        return res.status(400).json({
          message: `Size ${item.size} not available for product ${product.name}`,
        });
      }

      if (product?.stock[sizeIndex].stock < item?.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product ${product.name} in size ${item.size}. Available stock: ${product.sizes[sizeIndex].stock}`,
        });
      }

      // Adjust stock
      product.stock[sizeIndex].stock -= item.quantity;
      await product.save();
    }

    // Create and save the order
    const newOrder = new Order({
      userId,
      items,
      BillAmount,
      shippingAddress,
      paymentMethod,
      discount,
    });

    const savedOrder = await newOrder.save();

    if (savedOrder) {
      // Clear cart
      const cart = await Cart.findOneAndUpdate(
        { user: userId },
        { $set: { items: [] } },
        { new: true }
      );
    }

    res.status(201).json({
      message: "Order confirmed successfully",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Error confirming order:", error);
    res.status(500).json({ message: "Failed to confirm order" });
  }
});

// -------------------------------route => GET/v1/orders/user-orders----------------------------------------------
///* @desc   Get all orders for a specific user
///? @access Private

export const getOrderData = expressAsyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ user: userId }).populate({
      path: "items.productId",
      populate: { path: "brand" },
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found for this user" });
    }

    res.status(200).json({ message: "Orders retrieved successfully", orders });
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
    const { id } = req.params;
    const order = await Order.findById(id).populate({
      path: "items.productId",
      populate: { path: "brand" },
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
