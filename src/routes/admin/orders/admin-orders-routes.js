import { Router } from "express";
import {
  generateSaleReport,
  getAllOrderData,
  getOrderDetailsById,
  updateOrderItemStatus,
} from "../../../controllers/admin/orders/admin-orders-controllers.js";

const orderRouter = Router();

orderRouter.get("/", getAllOrderData);
orderRouter.get("/salesReport", generateSaleReport);
orderRouter.get("/:id", getOrderDetailsById);
orderRouter.patch("/:id/items/:itemId/status", updateOrderItemStatus);


export default orderRouter;
