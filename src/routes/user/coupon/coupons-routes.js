import { Router } from "express";
import {
  getCoupons,
  applyCoupon,
  removeCoupon,
} from "../../../controllers/user/coupon/coupon-controllers.js";

const UserCouponRouter = Router();

//// ------------------------------- Coupon Routes ----------------------------------------------

// Route to get applicable coupons for the user's cart
UserCouponRouter.get("/get-coupons", getCoupons);

// Route to apply a coupon to the user's cart
UserCouponRouter.post("/apply-coupon", applyCoupon);

// Route to remove an applied coupon from the user's cart
UserCouponRouter.delete("/remove-coupon", removeCoupon);

export default UserCouponRouter;
