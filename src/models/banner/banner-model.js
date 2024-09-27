import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Products",
      required: true,
      validate: {
        validator: async function (productId) {
          const product = await mongoose.model("Products").findById(productId);
          return !!product; // Returns false if the product doesn't exist
        },
        message: "Product does not exist",
      },
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      minlength: [5, "Title must be at least 5 characters long"],
      maxlength: [50, "Title must be at most 50 characters long"],
    },
    subTitle: {
      type: String,
      required: [true, "Subtitle is required"],
      minlength: [5, "Subtitle must be at least 5 characters long"],
      maxlength: [100, "Subtitle must be at most 100 characters long"],
    },
    isActive: {
      type: Boolean,
      default: true,
      validate: {
        validator: function(value) {
          // Optional: Ensure it's a boolean value
          return typeof value === 'boolean';
        },
        message: props => `${props.value} is not a valid boolean value for isActive!`
      }
    },
    image: {
      type: String,
      required: [true, "Image URL is required"],
      validate: {
        validator: function (v) {
          // Checks if the URL is valid
          return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v);
        },
        message: "Invalid URL format",
      },
    },
  },
  { timestamps: true }
);

// Pre-save hook to avoid duplicates, though it's less likely needed for this schema
bannerSchema.pre("save", function (next) {
  this.title = this.title.trim();
  this.subTitle = this.subTitle.trim();
  next();
});

export const BannerModel = mongoose.model("Banner", bannerSchema);
