
import expressAsyncHandler from "express-async-handler";

import Order from "../../../models/order/order-model.js";

// -------------------------------route => GET/v1/orders----------------------------------------------
///* @desc   Get all orders (admin)
///? @access Private (Admin)

const getAllOrderData = expressAsyncHandler(async (req, res) => {
    try {
      const orders = await Order.find().populate({
        path: "items.productId",
        populate: { path: "brand" },
      });
  
      res.status(200).json({ message: "Orders fetched successfully", orders });
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

  export {getOrderDetailsById,getAllOrderData};
  