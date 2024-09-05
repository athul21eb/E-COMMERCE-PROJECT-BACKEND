

import { Router } from "express";
import { cancelOrderItem, createOrder, getOrderData, getUserOrderDetailsById } from "../../../controllers/user/order/user-order-controllers.js";

const  userOrderRouter = Router();



userOrderRouter.post("/create", createOrder);
userOrderRouter.get("/user-orders", getOrderData);
userOrderRouter.get("/:id", getUserOrderDetailsById);
userOrderRouter.patch("/:orderId/items/:itemId/cancel",cancelOrderItem)
export default userOrderRouter  ;