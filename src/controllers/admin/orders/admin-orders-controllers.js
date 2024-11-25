import expressAsyncHandler from "express-async-handler";
import Order from "../../../models/order/order-model.js";
import Products from "./../../../models/products/products-model.js";
import { processRefund } from "../../../utils/helper/refundToWallet.js";
import { restoreProductStock } from "../../../utils/helper/productRestock.js";
import { v4 } from "uuid";
import getSalesReport, { getFullSalesReport } from "../../../utils/helper/saleReportGenerator.js";
// -------------------------------route => GET/v1/orders----------------------------------------------
///* @desc   Get all orders (admin)
///? @access Private (Admin)

const getAllOrderData = expressAsyncHandler(async (req, res) => {
  try {
    // Extract pagination parameters from query
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 10; // Default to 10 orders per page if not provided
    const skip = (page - 1) * limit;

    // Fetch paginated orders
    const orders = await Order.find(
      { orderStatus: { $ne: "Initiated" } },
      { _id: false }
    )
      .populate({
        path: "items.productId",
        populate: [
          { path: "brand" },
          { path: "category" }, // Assuming your Product model has a category field
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Count total number of orders
    const totalOrders = await Order.countDocuments({
      orderStatus: { $ne: "Initiated" },
    });

    res.status(200).json({
      message: "Orders fetched successfully",
      orders,
      totalOrders,
      page,
      totalPages: Math.ceil(totalOrders / limit),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: error.message });
  }
});

// -------------------------------route => GET/v1/orders/:id----------------------------------------------
///* @desc   Get order details by ID
///? @access Private

const getOrderDetailsById = expressAsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({
      orderId: id,
      orderStatus: { $ne: "Initiated" },
    }).populate({
      path: "items.productId",
      populate: [
        { path: "brand" },
        { path: "category" }, // Assuming your Product model has a category field
      ],
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order fetched successfully", order });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ message: error.message });
  }
});

//// -------------------------------route => PATCH/v1/admin/orders/:id/items/:itemId/status----------------------------------------------
///* @desc   Change Item status
///? @access Private

const updateOrderItemStatus = expressAsyncHandler(async (req, res) => {
  const { id, itemId } = req.params;
  const { status } = req.body;

  if (!id || !itemId || !status) {
    res.status(400);
    throw new Error(`OrderId , item Id and status  are required`);
  }
  // Validate status
  if (!["Shipped", "Delivered", "Cancelled"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status value");
  }

  // Find the order
  const order = await Order.findOne({
    orderId: id,
    orderStatus: { $ne: "Initiated" },
  });
  if (!order) {
    res.status(404);
    throw new Error("Order Not  Found");
  }

  // Find the item in the order
  const item = order.items.id(itemId);
  if (!item) {
    res.status(404);
    throw new Error("Item not found in this order");
  }

  // Check for duplicate status update
  const previousStatus = item.status;
  if (status === previousStatus) {
    res.status(400);
    throw new Error(`Item is already ${status}, invalid status change`);
  }

  // Define status priorities for comparison
  const statusPriority = {
    Pending: 1,
    Confirmed: 2,
    Cancelled: 3,
    Shipped: 4,
    Delivered: 5,

    "Return Requested": 6,
    "Return Accepted": 7,
    "Return Rejected": 8,
    Failed: 9,
  };

  // Get priority values for current and new statuses
  const currentPriority = statusPriority[previousStatus];
  const newPriority = statusPriority[status];

  // Restrict invalid status transitions
  if (currentPriority >= newPriority) {
    res.status(400);
    throw new Error("Invalid status transition due to current status level");
  }

  item.status = status;

  // If status is "Cancelled" and was not cancelled before, adjust stock
  if (status === "Cancelled") {
    item.cancelledDate = new Date();

    await processRefund(
      order,
      item,
      order.userId,
      `Refund for cancellation of item in order: ${order.orderId}`
    );

    await restoreProductStock(item.productId, item.size, item.quantity);
  }

  // Check if the new status is "Delivered" and update payment status
  if (status === "Delivered") {
    item.deliveryDate = new Date();

    const allOrderItemsDelivered = order.items.every(
      (item) => item.status === "Delivered"
    );

    if (allOrderItemsDelivered) {
      order.payment.status = "Success";
      order.payment.transactionId = v4();
    }
  }

  // Save the updated order
  await order.save();

  res.status(200).json({ message: "Item status updated successfully", order });
});


//// -------------------------------route => PATCH/v1/admin/orders/salesReport----------------------------------------------
///* @desc   saleReport 
///? @access Private

const generatePaginatedSaleReport = expressAsyncHandler(async (req, res) => {
  const { startDate, endDate, period, page = 1, limit = 10 } = req.query;

  // Ensure page and limit are numbers and greater than 0
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  if ((!startDate || !endDate) && !period) {
    res.status(400);
    throw new Error("Either startDate, endDate, or period must be provided.");
  }

  if (isNaN(pageNumber) || pageNumber <= 0) {
    res.status(400);
    throw new Error("Page number must be a positive integer.");
  }

  if (isNaN(limitNumber) || limitNumber <= 0) {
    res.status(400);
    throw new Error("Limit must be a positive integer.");
  }

  
  // Generate the sales report with pagination
const { orders, totalOrders } = await getSalesReport(res, startDate, endDate, period, pageNumber, limitNumber);

    // Send response
    res.status(200).json({
      message: "Sales report generated successfully",
      salesReport:{ orders, totalOrders },
    });
  
});



//// -------------------------------route => PATCH/v1/admin/orders/salesReport-download----------------------------------------------
///* @desc   saleReport 
///? @access Private

const generateSaleReportForDownload = expressAsyncHandler(async (req, res) => {
  
  const {period,startDate,endDate} = req.query;

  if ((!startDate || !endDate) && !period) {
    res.status(400);
    throw new Error("Either startDate, endDate, or period must be provided.");
  }

  // Generate the sales report with pagination
const salesReport = await getFullSalesReport(res,period,startDate,endDate);  // Send response
    res.status(200).json({
      message: "Sales report generated successfully",
      salesReport
    });
  
});
//// -------------------------------route => PATCH/v1/admin/orders/xlsx-SalesReport-----------------------------------------------
///* @desc   generateXlsxReport
///? @access Private

const generateXlsxReport = expressAsyncHandler(async (req, res) => {
  const { startDate, endDate, period, page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  if ((!startDate || !endDate) && !period) {
    res.status(400);
    throw new Error("Either startDate, endDate, or period must be provided.");
  }

  if (isNaN(pageNumber) || pageNumber <= 0) {
    res.status(400);
    throw new Error("Page number must be a positive integer.");
  }

  if (isNaN(limitNumber) || limitNumber <= 0) {
    res.status(400);
    throw new Error("Limit must be a positive integer.");
  }

  const reportData = await getSalesReport(res, startDate, endDate, period, pageNumber, limitNumber);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sales Report");

  worksheet.columns = [
    { header: "Order ID", key: "orderId", width: 30 },
    { header: "Order Amount", key: "billAmount", width: 25 },
    { header: "Coupon Discount", key: "appliedCouponAmount", width: 20 },
    { header: "Discount on MRP", key: "productDiscount", width: 20 },
    { header: "Date", key: "orderDate", width: 25 },
  ];

  reportData.orders.forEach((order) => {
    worksheet.addRow({
      orderId: order.orderId,
      billAmount: order.billAmount,
      appliedCouponAmount: order.appliedCouponAmount,
      productDiscount: order.items.reduce((acc, item) => acc + (item.appliedOfferAmount || 0), 0),
      orderDate: moment(order.orderDate).format("YYYY-MM-DD HH:mm:ss"),
    });
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=sales_report.xlsx");

  await workbook.xlsx.write(res);
  res.end();
});

//// -------------------------------route => PATCH/v1/admin/orders/pdf-SalesReport----------------------------------------------
///* @desc   generatePdfReport
///? @access Private
const generatePdfReport = expressAsyncHandler(async (req, res) => {
  const { startDate, endDate, period, page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  if ((!startDate || !endDate) && !period) {
    res.status(400);
    throw new Error("Either startDate, endDate, or period must be provided.");
  }

  if (isNaN(pageNumber) || pageNumber <= 0) {
    res.status(400);
    throw new Error("Page number must be a positive integer.");
  }

  if (isNaN(limitNumber) || limitNumber <= 0) {
    res.status(400);
    throw new Error("Limit must be a positive integer.");
  }

  const reportData = await getSalesReport(res, startDate, endDate, period, pageNumber, limitNumber);

  const doc = new PDFDocument({ margin: 40, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=sales_report.pdf");

  doc.pipe(res);

  // Add Title
  doc.fontSize(22).text("Sales Report", { align: "center", underline: true });
  doc.moveDown(2);

  // Add Summary
  doc.fontSize(12).text(`Sales Count: ${reportData.overallSalesCount}`);
  doc.fontSize(12).text(`Order Amount: ${reportData.overallOrderAmount}`);
  doc.fontSize(12).text(`Discount: ${reportData.overallDiscount}`);
  doc.fontSize(12).text(`Discount on MRP: ${reportData.totalDiscountOnMRP}`);
  doc.moveDown(2);

  // Table Headers
  const tableTop = doc.y;
  const columnWidth = {
    orderId: 80,
    orderDate: 130,
    billAmount: 100,
    appliedCouponAmount: 100,
    productDiscount: 130,
  };
  const rowHeight = 25;
  const headerBgColor = "#f2f2f2";

  doc.rect(30, tableTop, 570, rowHeight).fill(headerBgColor).stroke();

  doc
    .fillColor("black")
    .fontSize(14)
    .text("Order ID", 35, tableTop + 10, { width: columnWidth.orderId, align: "left" })
    .text("Date", 35 + columnWidth.orderId, tableTop + 10, { width: columnWidth.orderDate, align: "left" })
    .text("Order Amount", 35 + columnWidth.orderId + columnWidth.orderDate, tableTop + 10, { width: columnWidth.billAmount, align: "right" })
    .text("Coupon Discount", 35 + columnWidth.orderId + columnWidth.orderDate + columnWidth.billAmount, tableTop + 10, { width: columnWidth.appliedCouponAmount, align: "right" })
    .text("Discount on MRP", 35 + columnWidth.orderId + columnWidth.orderDate + columnWidth.billAmount + columnWidth.appliedCouponAmount, tableTop + 10, { width: columnWidth.productDiscount, align: "right" });

  doc.moveDown(1);
  doc.moveTo(30, doc.y).lineTo(600, doc.y).stroke();
  doc.moveDown(1);

  reportData.orders.forEach((order, index) => {
    const y = doc.y;
    const rowColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";
    doc.rect(30, y, 570, rowHeight).fill(rowColor).stroke();

    doc
      .fillColor("black")
      .fontSize(12)
      .text(order.orderId, 35, y + 10, { width: columnWidth.orderId, align: "left" })
      .text(moment(order.orderDate).format("YYYY-MM-DD HH:mm:ss"), 35 + columnWidth.orderId, y + 10, { width: columnWidth.orderDate, align: "left" })
      .text(order.billAmount, 35 + columnWidth.orderId + columnWidth.orderDate, y + 10, { width: columnWidth.billAmount, align: "right" })
      .text(order.appliedCouponAmount, 35 + columnWidth.orderId + columnWidth.orderDate + columnWidth.billAmount, y + 10, { width: columnWidth.appliedCouponAmount, align: "right" })
      .text(order.items.reduce((acc, item) => acc + (item.appliedOfferAmount || 0), 0), 35 + columnWidth.orderId + columnWidth.orderDate + columnWidth.billAmount + columnWidth.appliedCouponAmount, y + 10, { width: columnWidth.productDiscount, align: "right" });

    doc.moveDown(1);
  });

  doc.end();
});





export {
  getOrderDetailsById,
  getAllOrderData,
  updateOrderItemStatus,
  generatePaginatedSaleReport,
  generatePdfReport,
  generateXlsxReport,
  generateSaleReportForDownload
};
