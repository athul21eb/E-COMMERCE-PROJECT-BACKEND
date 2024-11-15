import { Router } from "express";
import {
  generatePaginatedSaleReport,
  generateSaleReportForDownload,
  getAllOrderData,
  getOrderDetailsById,
  updateOrderItemStatus,
} from "../../../controllers/admin/orders/admin-orders-controllers.js";

const orderRouter = Router();

orderRouter.get("/", getAllOrderData);
orderRouter.get("/salesReport", generatePaginatedSaleReport);
orderRouter.get("/salesReport-download",generateSaleReportForDownload);
orderRouter.get("/:id", getOrderDetailsById);
orderRouter.patch("/:id/items/:itemId/status", updateOrderItemStatus);


export default orderRouter;
