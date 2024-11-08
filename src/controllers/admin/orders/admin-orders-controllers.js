import expressAsyncHandler from "express-async-handler";
import Order from "../../../models/order/order-model.js";
import Products from "./../../../models/products/products-model.js";
import { processRefund } from "../../../utils/helper/refundToWallet.js";
import { restoreProductStock } from "../../../utils/helper/productRestock.js";
import { v4 } from "uuid";
// -------------------------------route => GET/v1/orders----------------------------------------------
///* @desc   Get all orders (admin)
///? @access Private (Admin)

const getAllOrderData = expressAsyncHandler(async (req, res) => {
  try {
    // Extract pagination parameters from query
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 10; // Default to 10 orders per page if not provided
    const skip = (page - 1) * limit;

 // Fetch paginated orders
const orders = await Order.find(
  { orderStatus: { $ne: "Initiated" } },
  { _id: false }
)
  .populate({
    path: "items.productId",
    populate: [
      { path: "brand" },
      { path: "category" }, // Assuming your Product model has a category field
    ],
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);

// Count total number of orders
const totalOrders = await Order.countDocuments({ orderStatus: { $ne: "Initiated" } });


    res.status(200).json({
      message: "Orders fetched successfully",
      orders,
      totalOrders,
      page,
      totalPages: Math.ceil(totalOrders / limit),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: error.message });
  }
});

// -------------------------------route => GET/v1/orders/:id----------------------------------------------
///* @desc   Get order details by ID
///? @access Private

const getOrderDetailsById = expressAsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({
      orderId: id,
      orderStatus: { $ne: "Initiated" },
    }).populate({
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

//// -------------------------------route => PATCH/v1/admin/orders/:id/items/:itemId/status----------------------------------------------
///* @desc   Change Item status
///? @access Private

const updateOrderItemStatus = expressAsyncHandler(async (req, res) => {
  const { id, itemId } = req.params;
  const { status } = req.body;

  if (!id || !itemId || !status) {
    res.status(400);
    throw new Error(`OrderId , item Id and status  are required`);
  }
  // Validate status
  if (!["Shipped", "Delivered", "Cancelled"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status value");
  }

  // Find the order
  const order = await Order.findOne({
    orderId: id,
    orderStatus: { $ne: "Initiated" },
  });
  if (!order) {
    res.status(404);
    throw new Error("Order Not  Found");
  }

  // Find the item in the order
  const item = order.items.id(itemId);
  if (!item) {
    res.status(404);
    throw new Error("Item not found in this order");
  }

  // Check for duplicate status update
  const previousStatus = item.status;
  if (status === previousStatus) {
    res.status(400);
    throw new Error(`Item is already ${status}, invalid status change`);
  }

  // Define status priorities for comparison
  const statusPriority = {
    Pending: 1,
    Confirmed: 2,
    Cancelled: 3,
    Shipped: 4,
    Delivered: 5,

    "Return Requested": 6,
    "Return Accepted": 7,
    "Return Rejected": 8,
    Failed: 9,
  };

  // Get priority values for current and new statuses
  const currentPriority = statusPriority[previousStatus];
  const newPriority = statusPriority[status];

  // Restrict invalid status transitions
  if (currentPriority >= newPriority) {
    res.status(400);
    throw new Error("Invalid status transition due to current status level");
  }

  item.status = status;

  // If status is "Cancelled" and was not cancelled before, adjust stock
  if (status === "Cancelled") {
    item.cancelledDate = new Date();

    await processRefund(order, item, order.userId,`Refund for cancellation of item in order: ${order.orderId}`);

    await restoreProductStock(item.productId, item.size, item.quantity);
  }

  // Check if the new status is "Delivered" and update payment status
  if (status === "Delivered") {
    item.deliveryDate = new Date();

    const allOrderItemsDelivered = order.items.every(
      (item) => item.status === "Delivered"
    );

    if (allOrderItemsDelivered) {
      order.payment.status = "Success";
      order.payment.transactionId = v4();
    }
  }

  // Save the updated order
  await order.save();

  res.status(200).json({ message: "Item status updated successfully", order });
});

export { getOrderDetailsById, getAllOrderData, updateOrderItemStatus };
