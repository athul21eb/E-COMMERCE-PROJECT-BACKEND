import mongoose from "mongoose";
import { addressSchema } from "../user/address/address-model.js";
import { v4 } from "uuid";
import User from "../user/user-model.js";
import Products from "../products/products-model.js";
const Schema = mongoose.Schema;

const itemSchema = new Schema({
  productId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Products",
    required: [true, "Product id is required"],
    validate: {
      validator: async function (v) {
        const product = await Products.findById(v);
        return !!product;
      },
      message: "Product id does not exist",
    },
  },
  quantity: {
    type: Number,
    required: [true, "Product quantity is required"],
    default: 0,
    validate: {
      validator: (v) => v > 0 && v <= 5,
      message: "Minimum order quantity is 1, and max is 5 per product",
    },
  },
  size: { type: String, required: true },
  unitPrice: {
    type: Number,
    required: [true, "Unit price is required"],
    validate: {
      validator: (v) => v > 100,
      message: "Unit price must be a positive number greater than 100",
    },
  },

  itemTotalPrice: Number,

  appliedOfferAmount: Number,

  status: {
    type: String,
    enum: [
      "Pending",
      "Confirmed",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Return Requested",
      "Return Accepted",
      "Return Rejected",
      "Failed",
    ],
    default: "Pending", // Fixed the case of "pending"
    required: [true, "Product order status is required"],
  },
  deliveryDate: Date,
  cancelledDate: Date,
});

const orderSchema = new Schema(
  {
    orderId: { type: String, required: true, default: v4 }, // Moved to use v4 directly
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: [true, "User id is required"],
      validate: {
        validator: async function (v) {
          const user = await User.findById(v);
          return !!user;
        },
        message: "User id not found",
      },
    },
    items: [itemSchema],
    billAmount: {
      type: Number,
      validate: {
        validator: (v) => v > 100,
        message: "Bill amount must be a positive number above 100",
      },
    },
    shippingAddress: addressSchema,
    payment: {
      method: {
        type: String,
        enum: ["PayOnDelivery", "RazorPay", "Wallet"],
        required: true,
      },
      status: {
        type: String,
        enum: ["Pending", "Success", "Failed"],
        default: "Pending",
        required: [true, "Payment status is required"],
      },
      transactionId: {
        type: String,
        required: false, // Optional field if transaction ID is not always available
      },
      gateway_order_id: {
        type: String,
        required: false, // Optional if it's for certain payment gateways only
      }
    }
,    
    orderStatus: {
      type: String,
      enum: ["Initiated", "Pending", "Confirmed", "Failed"],
      default: "Pending",
      required: [true, "Order status is required"],
    },
    orderDate: { type: Date, default: Date.now },
    appliedCouponAmount: Number,
  },
  { timestamps: true }
);

// // Status priority
// const statusPriority = {
//   Pending: 1,
//   Shipped: 2,
//   Delivered: 3,
//   Cancelled: 4,
// };

// // Method to update order status
// orderSchema.methods.updateOrderStatus = async function () {
//   const allCancelled = this.items.every((item) => item.status === "Cancelled");

//   if (allCancelled) {
//     this.orderStatus = "Cancelled";
//   } else {
//     const highestStatus = this.items.reduce((highest, item) => {
//       return statusPriority[item.status] < statusPriority[highest]
//         ? item.status
//         : highest;
//     }, "Pending"); // Updated default to "Pending"
//     this.orderStatus = highestStatus;
//   }

//   await this.save();
// };

const Order = mongoose.model("Order", orderSchema);

export default Order;
