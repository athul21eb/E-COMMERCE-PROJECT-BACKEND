import mongoose from "mongoose";

const StockSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
});

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim:true,
    },
    description: {
      type: String,
      required: true,
      trim:true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brands",
      required: true,
    },
    
    stock: [StockSchema], // Array of StockSchema
    regularPrice: {
      type: Number,
      required: true,
    },
   
    salePrice: {
      type: Number,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    gallery: [
      {
        type: String,
      },
    ],
    isActive: {
      type: Boolean,
      default:true,
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
