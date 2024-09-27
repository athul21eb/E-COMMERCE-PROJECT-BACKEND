import mongoose from "mongoose";
import { addressSchema } from "../user/address/address-model.js";
import { v4 } from "uuid";
const Schema = mongoose.Schema;

const itemSchema = new Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Products",
      required: true,
    },
    quantity: { type: Number, required: true },
    size: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    deliveryDate: {
      type: Date,
    },
    cancelledDate: {
      type: Date,
    },

    discount: {
      // Adding discount for each item
      type: Number,
      default: 0,
    },
  }
  // Disable creation of `_id` for sub-documents
);

const orderSchema = new Schema(
  {
    orderId: { type: String, default: v4(), required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [itemSchema],
    billAmount: {
      type: Number,
      required: true,
    },

    shippingAddress: addressSchema,
    paymentMethod: {
      type: String,
      enum: ["PayOnDelivery", "Credit Card", "Debit Card", "UPI", "Wallet"],
      required: true,
    },
    paymentStatus: {
      // Adding payment status
      type: String,
      enum: ["Pending", "Completed", "Failed"],
      default: "Pending",
    },
    transactionId: {
      // Adding transaction ID for payment
      type: String,
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const statusPriority = { Pending: 1, Shipped: 2, Delivered: 3, Cancelled: 4 };

orderSchema.methods.updateOrderStatus = async function () {
  // Check if all items are cancelled
  const allCancelled = this.items.every((item) => item.status === "Cancelled");

  if (allCancelled) {
    this.orderStatus = "Cancelled";
  } else {
    // Get the highest priority status from the items
    const highestStatus = this.items.reduce((highest, item) => {
      return statusPriority[item.status] < statusPriority[highest]
        ? item.status
        : highest;
    }, "Delivered"); // Default to "Delivered" if no status is found

    this.orderStatus = highestStatus;
  }

  await this.save(); // Save the updated order
};

const Order = mongoose.model("Order", orderSchema);

export default Order;
