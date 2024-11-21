import { Router } from "express";
import categoryRouter from "./category/category-routes.js";
import brandRouter from "./brand/brand-routes.js";
import productRouter from "./products/products-routes.js";
import customerRouter from "./customers/customers-router.js";
import orderRouter from "./orders/admin-orders-routes.js";
import bannerRouter from "./banner/banner-routes.js";
import offerRouter from "./offers/offers-router.js";
import CouponRouter from "./coupons/coupons-router.js";
import ReturnOrderRouter from "./returnOrders/return-orders-routes.js";
import DashBoardRouter from "./dashboard/dashboard-routes.js";

const AdminRouter = Router();

//// ------------------------------- Admin category Routes----------------------------------------------
AdminRouter.use('/categories',categoryRouter);

//// ------------------------------- Admin brand Routes----------------------------------------------
AdminRouter.use('/brands',brandRouter);

//// ------------------------------- Admin product Routes----------------------------------------------


AdminRouter.use('/products',productRouter);


//// ------------------------------- Admin product Routes----------------------------------------------


AdminRouter.use('/customers',customerRouter);



//// ------------------------------- Admin product Routes----------------------------------------------


AdminRouter.use('/orders',orderRouter);

////-------------------------------------Admin brand Routers--------------------------------

AdminRouter.use('/banners',bannerRouter)

////-------------------------------------Admin offer Routers--------------------------------

AdminRouter.use('/offers',offerRouter)

////-----------------------------------------------Admin coupons Routers----------------------------

AdminRouter.use('/coupons',CouponRouter)
////-----------------------------------------------admin return order routes-------------------

AdminRouter.use("/return-orders",ReturnOrderRouter);

////-----------------------------------------------admin DashBoard routes-------------------

AdminRouter.use("/dashboard",DashBoardRouter);




export default AdminRouter