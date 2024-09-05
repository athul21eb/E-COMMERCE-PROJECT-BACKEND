import mongoose from "mongoose";

export const addressSchema = mongoose.Schema(
	{
		firstName: {
			type: String,
			required: true,
			trim: true,
		},
		lastName: {
			type: String,
			required: true,
			trim: true,
		},
		state: {
			type: String,
			required: true,
			trim: true,
		},
		district: {
			type: String,
			required: true,
			trim: true,
		},
		city: {
			type: String,
			required: true,
			trim: true,
		},
		pincode: {
			type: String,
			required: true,
			trim: true,
		},
		landmark: {
			type: String,
			required: false,
			trim: true,
		},
		mobileNumber: {
			type: String,
			required: true,
			trim: true,
			match: /^[0-9]{10}$/, // Ensures exactly 10 digits
		},
		alternateNumber: {
			type: String,
			required: false,
			trim: true,
			match: /^[0-9]{10}$/, // Ensures exactly 10 digits if provided
		},
        isDefaultAddress: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	}
);


