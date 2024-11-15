

import { Router } from "express";
import { cancelOrderItem, createOrder, getOrderData, getUserOrderDetailsById, returnOrderItem, verifyPayment } from "../../../controllers/user/order/user-order-controllers.js";

const  userOrderRouter = Router();



userOrderRouter.post("/create", createOrder);
userOrderRouter.post('/verify-payment',verifyPayment)
userOrderRouter.get("/user-orders", getOrderData);
userOrderRouter.get("/:id", getUserOrderDetailsById);
userOrderRouter.patch("/:orderId/items/:itemId/cancel",cancelOrderItem)
userOrderRouter.patch("/:orderId/items/:itemId/return",returnOrderItem)
export default userOrderRouter  ;