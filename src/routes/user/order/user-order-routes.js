

import { Router } from "express";
import { createOrder, getOrderData, getUserOrderDetailsById } from "../../../controllers/user/order/user-order-controllers.js";

const  userOrderRouter = Router();



userOrderRouter.post("/create", createOrder);
userOrderRouter.get("/user-orders", getOrderData);
userOrderRouter.get("/:id", getUserOrderDetailsById);
export default userOrderRouter  ;