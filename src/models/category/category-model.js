import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim:true,
    },
    categoryDescription: {
      type: String,
      required: true,
      trim:true,
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

// Pre-save middleware to transform the categoryName
CategorySchema.pre("save", function (next) {
  if (this.categoryName) {
    this.categoryName =
      this.categoryName.charAt(0).toUpperCase() +
      this.categoryName.slice(1).toLowerCase();
  }
  next();
});

const CategoryModel = mongoose.model("Category", CategorySchema);

export default CategoryModel;
