import expressAsyncHandler from "express-async-handler";
import ReturnOrderModel from "../../../models/returnOrder/return-order-model.js";
import Order from "../../../models/order/order-model.js";
import { restoreProductStock } from "../../../utils/helper/productRestock.js";
import { processRefund } from "../../../utils/helper/refundToWallet.js";


//// -------------------------------route => GEt/v1/admin/return-order----------------------------------------------
///* @desc   get all return orders for admin
///? @access Private

export const getAllReturnOrders = expressAsyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1; // default to page 1 if not provided
  const limit = parseInt(req.query.limit) || 10; // default to 10 items per page if not provided
  const skip = (page - 1) * limit;

  // Fetch the total number of return orders
  const totalOrders = await ReturnOrderModel.countDocuments();

  // Fetch the return orders with pagination
  const returnOrders = await ReturnOrderModel.find({})
    .populate({
      path: "userId",
      select: "email firstName -_id",
    })
    .populate({
      path:"orderId",
      select:"_id orderId"
    })
    .populate({path:"productId",
      select:"productName thumbnail -_id"
    })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    message: "Return orders successfully fetched",
    orders: returnOrders,
    totalOrders,
  });
});

//// -------------------------------route => PATCH/v1/admin/return-order/:orderId/items/:itemId/confirm----------------------------------------------
///* @desc   Change Item return approve or not
///? @access Private

export const ReturnOrderConfirm = expressAsyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params;
  const {status} = req.body;



  if (!orderId || !itemId || !status) {
    res.status(400);
    throw new Error("order Id , itemId and status is required");
  }
  if (status !== "approved" && status !== "rejected") {
    res.status(400);
    throw new Error(`Invalid status -  ${status}`);
  }

  const _returnOrder = await ReturnOrderModel.findOne({ orderId, itemId });
  if (!_returnOrder) {
    res.status(404);
    throw new Error("returned Order Not Found");
  }

  
  if (
    _returnOrder.status === "approved" ||
    _returnOrder.status === "rejected"
  ) {
    res.status(400);
    throw new Error(`return Order Already Confirmed as ${_returnOrder.status}`);
  }

  if(_returnOrder.status!=="requested"){
    res.status(400);
    throw new Error("return Order status is invalid .");
  }

  const order = await Order.findById(orderId);
  _returnOrder.status = status;
  const item = order.items.id(itemId);
  
  if (_returnOrder.status === "approved") {
    _returnOrder.approvedAt = new Date();

    
    if (_returnOrder.reason !== "Product arrived damaged or defective") {
      await restoreProductStock(item.productId, item.size, item.quantity);
    }

    await processRefund(
      order,
      item,
      _returnOrder.userId,
      `Refund for Return request approval  of item in order: ${order.orderId}`
    );
  }

  _returnOrder.status === "approved"
    ? (item.status = "Return Accepted")
    : (item.status = "Return Rejected");


  await _returnOrder.save();
  await order.save();

  res.status(200).json({message:`return Order status changed into ${status} of item in  ${order.orderId}`})
});
