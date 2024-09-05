import { Router } from "express";
import categoryRouter from "./category/category-routes.js";
import brandRouter from "./brand/brand-routes.js";
import productRouter from "./products/products-routes.js";
import customerRouter from "./customers/customers-router.js";
import orderRouter from "./orders/admin-orders-routes.js";

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











export default AdminRouter