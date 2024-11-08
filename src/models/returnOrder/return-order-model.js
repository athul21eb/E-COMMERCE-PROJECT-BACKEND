import mongoose from "mongoose";

import Order from "../order/order-model.js";
import UserModel from "../user/user-model.js";
import Products from "../products/products-model.js";

const returnOrderSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Order",
    required: [true, "Order Id is required"],
    validate: {
      validator: async (v) => {
        const order = await Order.findById(v);
        return !!order;
      },
      message: "Order with ID not found",
    },
  },
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Users",
    required: [true, "User ID is required"],
    validate: {
      validator: async (v) => {
        const user = await UserModel.findById(v);
        return !!user;
      },
      message: "User with ID not found",
    },
  },
  productId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Products",
    required: [true, "Product ID is required"],
    validate: {
      validator: async (v) => {
        const product = await Products.findById(v);
        return !!product;
      },
      message: "Product with ID not found",
    },
  },
  itemId: {
    type: String,
    required: [true, "Item ID is required"],
  },
  reason: {
    type: String,
    enum:{
        values:[
            "Product arrived damaged or defective",
            "Incorrect item received",
            "Product does not match description",
            "Changed mind after purchase",
            "Product does not fit as expected",
            "Other Reason",
          ],
          message:"Enter a valid Reason for return an Order"
    },
    required: [true, "A reason is required for returning an order"],
  },
  remarks: {
    type: String,
  },
  status: {
    type: String,
    enum: {
      values: ["requested", "approved", "rejected"],
      message: "Invalid status for returning an order",
    },
    default:"requested"
  },
  approvedAt: {
    type: Date,
  },
}, { timestamps: true }); // Corrected `timestamps` option

const ReturnOrderModel = mongoose.model("ReturnOrder", returnOrderSchema);

export default ReturnOrderModel;
