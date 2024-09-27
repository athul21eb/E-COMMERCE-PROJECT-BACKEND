import { Router } from "express";
import { addToWishlist, removeFromWishlist,getWishList, moveToBag } from "../../../controllers/user/wishlist/wishlist-controllers.js";

const WishlistRouter = Router();

// Add a product to the wishlistAddToWishlist
WishlistRouter.post("/add", addToWishlist);

// Remove a product from the wishlist
WishlistRouter.delete("/remove/:productId", removeFromWishlist);

WishlistRouter.get("/",getWishList);


WishlistRouter.post("/move-to-bag",moveToBag)

export default WishlistRouter;
