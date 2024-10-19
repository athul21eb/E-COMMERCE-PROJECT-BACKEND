import mongoose from "mongoose";
import { Coupon } from "../coupons/coupons-model.js";

const cartItemSchema = new mongoose.Schema({
	productId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Products",
		required: true,
	},
	quantity: {
		type: Number,
		default: 1,
		min: 1,
	},
	size: {
		type: String,
		required: true,
	},
});

const cartSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	items: [cartItemSchema],
	appliedCoupon:{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Coupon",
		
	}
});

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;