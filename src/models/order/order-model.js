import mongoose from "mongoose";
import { addressSchema } from "../user/address/address-model.js";
const Schema = mongoose.Schema;

const orderSchema = new Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		items: [
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
			},
		],
		BillAmount: {
			type: Number,
			required: true,
		},
		discount: {
			type: Number,
			required: false,
		},
		shippingAddress: addressSchema,
		paymentMethod: {
			type: String,
			enum: ["PayOnDelivery", "Credit Card", "Debit Card", "UPI", "Wallet"],
			required: true,
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

const Order = mongoose.model("Order", orderSchema);

export default Order;
