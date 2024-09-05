
import expressAsyncHandler from "express-async-handler";
import Order from "../../../models/order/order-model.js";
import Products from "./../../../models/products/products-model.js";
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
    const orders = await Order.find()
    .populate({
      path: "items.productId",
      populate: [
        { path: "brand" },
        { path: "category" } // Assuming your Product model has a category field
      ],
    })
      .skip(skip)
      .limit(limit);

    // Count total number of orders
    const totalOrders = await Order.countDocuments();

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
      const order = await Order.findById(id).populate({
        path: "items.productId",
        populate: [
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

  const updateOrderItemStatus = expressAsyncHandler(async (req, res) => {
    try {
      const { id, itemId } = req.params;
      const { status } = req.body;
  
      // Validate status
      if (!["Pending", "Shipped", "Delivered", "Cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
  
      // Find the order
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
  
      // Find the item in the order
      const item = order.items.id(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found in this order" });
      }
  
      // Update the item status
      const previousStatus = item.status;
      item.status = status;
  
      // Check if the status was changed to "Cancelled"
      if (status === "Cancelled" && previousStatus !== "Cancelled") {
        // Find the product
        const product = await Products.findById(item.productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }
  
        // Return the product to stock
        product.stock += item.quantity; // Assuming `stock` is the field representing the available quantity
        await product.save();
      }
  
      // Check if the new status is "Delivered" and update payment status
      if (status === "Delivered") {
        order.paymentStatus = "Completed";
      }
  
      // Update the order status
      await order.updateOrderStatus(); // Custom method to update order status
  
      // Save the updated order
      await order.save();
  
      res.status(200).json({ message: "Item status updated successfully", order });
    } catch (error) {
      console.error("Error updating item status:", error);
      res.status(500).json({ message: error.message });
    }
  });


  export {getOrderDetailsById,getAllOrderData,updateOrderItemStatus};
  