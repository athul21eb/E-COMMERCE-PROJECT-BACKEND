import { Router } from "express";
import {
  cancelOrderItem,
  createOrder,
  getOrderData,
  getUserOrderDetailsById,
  retryPayment,
  returnOrderItem,
  verifyPayment,
} from "../../../controllers/user/order/user-order-controllers.js";

const userOrderRouter = Router();

userOrderRouter.post("/create", createOrder);
userOrderRouter.post("/verify-payment", verifyPayment);
userOrderRouter.get("/user-orders", getOrderData);
userOrderRouter.put("/retry-payment/:orderId", retryPayment);
userOrderRouter.get("/:id", getUserOrderDetailsById);
userOrderRouter.patch("/:orderId/items/:itemId/cancel", cancelOrderItem);
userOrderRouter.patch("/:orderId/items/:itemId/return", returnOrderItem);
export default userOrderRouter;
