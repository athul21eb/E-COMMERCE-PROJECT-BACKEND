

import { Router } from "express";
import { getAllOrderData, getOrderDetailsById } from "../../../controllers/admin/orders/admin-orders-controllers.js";

const orderRouter = Router();

orderRouter.get("/",  getAllOrderData);


orderRouter.get("/:id", getOrderDetailsById);



export default orderRouter;