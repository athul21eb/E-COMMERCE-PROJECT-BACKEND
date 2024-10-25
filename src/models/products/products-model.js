import mongoose from "mongoose";

const StockSchema = new mongoose.Schema({
  size: {
    type: String,
    required: [true, "Size is required"],
  },
  stock: {
    type: Number,
    required: [true, "Stock is required"],
    min: [0, "Stock must be at least 0"],
  },
});

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [3, "Product name must be at least 3 characters long"],
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      minlength: [10, "Product description must be at least 10 characters long"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brands",
      required: [true, "Brand is required"],
    },
    stock: {
      type: [StockSchema], // Array of StockSchema
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one stock entry is required",
      },
    },
    regularPrice: {
      type: Number,
      required: [true, "Regular price is required"],
      min: [100, "Regular price must be a positive number more than 100"],
    },
    salePrice: {
      type: Number,
      required: [true, "Sale price is required"],
      min: [100, "Sale price must be a positive number more than 100"],
      validate: {
        validator: function (value) {
          return value <= this.regularPrice;
        },
        message: "Sale price must be less than or equal to the regular price",
      },
    }, offerPrice: {
      type: Number,
      
      min: [0, "offer price must be a positive number"],
      validate: {
        validator: function (value) {
          return value <= this.salePrice;
        },
        message: "offer price must be less than or equal to the sale price",
      },
    },
    thumbnail: {
      type: String,
      required: [true, "Thumbnail URL is required"],
      validate: {
        validator: function (v) {
          return /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif))$/.test(v);
        },
        message: (props) => `${props.value} is not a valid URL for thumbnail`,
      },
    },
    gallery: {
      type: [String],
      validate: {
        validator: function (v) {
          return v.every((url) => /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif))$/.test(url));
        },
        message: "Each gallery item must be a valid URL",
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

// Pre-save middleware to transform the productName
productSchema.pre("save", function (next) {
  if (this.productName) {
    this.productName =
      this.productName.charAt(0).toUpperCase() +
      this.productName.slice(1).toLowerCase();
  }
  next();
});

const Products = mongoose.model("Products", productSchema);
export default Products;
