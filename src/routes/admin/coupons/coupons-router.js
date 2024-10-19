

import { Router } from "express";
import {addCoupon,deleteCoupon,getCoupons} from '../../../controllers/admin/coupon/coupon-controller.js'

const CouponRouter = Router();


CouponRouter.get('/',getCoupons);

CouponRouter.post('/add',addCoupon);

CouponRouter.delete('/delete/:couponId',deleteCoupon);

export default CouponRouter;