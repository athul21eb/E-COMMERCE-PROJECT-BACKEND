import { Router } from "express";
import CartRouter from "./cart/cart-routers.js";
import ProfileRouter from "./profile/profile-routes.js";
import userOrderRouter from "./order/user-order-routes.js";
import WishlistRouter from "./wishlist/wishList-routes.js";

const userRouter = Router();

//// ------------------------------- user category Routes----------------------------------------------
userRouter.use("/cart", CartRouter);
userRouter.use('/profile',ProfileRouter);
userRouter.use('/orders',userOrderRouter);
userRouter.use('/wishlist',WishlistRouter);



export default userRouter;
