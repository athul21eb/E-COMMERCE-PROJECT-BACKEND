import mongoose from "mongoose";
import Products from "../products/products-model.js";
import CategoryModel from "../category/category-model.js";

// Offer Schema
const offerSchema = new mongoose.Schema(
  {
    offerTitle: {
      type: String,
      required: [true, "Offer title is required"],
      minlength: [3, "Offer title must be at least 3 characters long"],
      maxlength: [100, "Offer title cannot exceed 100 characters"],
    },
    offerDescription: {
      type: String,
      required: [true, "Offer description is required"],
      minlength: [10, "Offer description must be at least 10 characters long"],
      maxlength: [500, "Offer description cannot exceed 500 characters"],
    },
    discountPercentage: {
      type: Number,
      required: [true, "Discount percentage is required"],
      min: [0, "Discount percentage cannot be less than 0"],
      max: [100, "Discount percentage cannot exceed 100"],
      
      trim:true,
      validate: {
        validator: Number.isInteger,
        message: "Discount percentage must be an integer",
      },
    },
    offerType: {
      type: String,
      enum: {
        values: ["product", "category"],
        message: 'Offer type must be either "product" or "category"',
      },
      required: [true, "Offer type is required"],
    },
    appliedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Products",
      },
    ],
    appliedCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      // validate: {
      //   validator: function (value) {
      //     return value >=  Date.now();
      //   },
      //   message: "Start date cannot be in the past",
      // },
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (value) {
          return value >= this.startDate;
        },
        message: "End date must be after the start date",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);



// Export the Offer model
export default mongoose.model("Offer", offerSchema);
