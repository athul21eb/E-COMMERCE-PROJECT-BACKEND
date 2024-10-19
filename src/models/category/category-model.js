import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: [3, "Category name must be at least 3 characters long"],
      unique: true, // Ensure category names are unique
    },
    categoryDescription: {
      type: String,
      required: [true, "Category description is required"],
      trim: true,
      minlength: [10, "Category description must be at least 10 characters long"],
    },
    isActive: {
      type: Boolean,
      default: true,
      required: [true, "isActive is required"],
      validate: {
        validator: function (v) {
          return typeof v === "boolean";
        },
        message: "isActive must be a boolean value",
      },
    },
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer", // Reference to the Offer model
      validate: {
        validator: async function (value) {
          // Check if the offer exists in the Offer collection if value is provided
          if (!value) return true; // If no offer is provided, skip validation
          const offer = await mongoose.models.Offer.findById(value);
          return !!offer; // Must return true if the offer exists
        },
        message: "Offer ID is not valid",
      },
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
