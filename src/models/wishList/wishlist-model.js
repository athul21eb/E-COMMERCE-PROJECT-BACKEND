import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Products",
        validate: {
          validator: async function (productId) {
            const product = await mongoose.model("Products").findById(productId);
            return !!product; // Returns false if product doesn't exist
          },
          message: "Product does not exist",
        },
      },
    ],
  },
  { timestamps: true }
);

// Check if the model is already defined to prevent overwriting
const Wishlist = mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema);


export default Wishlist;
