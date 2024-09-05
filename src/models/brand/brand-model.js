import mongoose from "mongoose";

const BrandSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      required: true,
      trim:true,
    },
    brandDescription: {
      type: String,
      required: true,
      trim:true,
    },
    brandPhotoUrl: {
      type: String, // Field for the photo URL of the brand
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to transform the brandName
BrandSchema.pre("save", function (next) {
  if (this.brandName) {
    this.brandName =
      this.brandName.charAt(0).toUpperCase() +
      this.brandName.slice(1).toLowerCase();
  }
  next();
});

const BrandModel = mongoose.model("Brands", BrandSchema);

export default BrandModel;
