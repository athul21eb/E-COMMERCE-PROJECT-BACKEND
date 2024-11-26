import { Router } from "express";
import {
  addToCart,
  getCartWithStockAdjustment,
  removeToCart,
  updateOrMergeToCart,
  clearCart,
} from "../../../controllers/user/cart/cart-controllers.js";

const CartRouter = Router();

//// ------------------------------- Cart Routes----------------------------------------------

// Route to add a product to the cart
CartRouter.post("/add-to-cart", addToCart);

// Route to get the user's cart
CartRouter.get("/get-cart", getCartWithStockAdjustment);

// Route to remove a product from the cart
CartRouter.delete("/remove-from-cart/:itemId", removeToCart);

// Route to update a product's quantity or size in the cart
CartRouter.put("/update-cart/:itemId", updateOrMergeToCart);

// Route to clear the cart
CartRouter.delete("/clear-cart", clearCart);

export default CartRouter;
