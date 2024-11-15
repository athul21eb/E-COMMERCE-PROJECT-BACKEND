import moment from "moment";
import Order from "../../models/order/order-model.js";

const getPaginatedSalesReport = async (res, startDate, endDate, period, page = 1, limit = 10) => {
  let start, end;

  // Define the start and end dates based on the period or the provided dates
  if (period === "day") {
    start = moment().startOf("day");
    end = moment().endOf("day");
  } else if (period === "week") {
    start = moment().startOf("week");
    end = moment().endOf("week");
  } else if (period === "month") {
    start = moment().startOf("month");
    end = moment().endOf("month");
  } else if (period === "year") {
    start = moment().startOf("year");
    end = moment().endOf("year");
  } else if (startDate && endDate) {
    start = moment(startDate).startOf("day");
    end = moment(endDate).endOf("day");
  } else {
    res.status(400);
    throw new Error("Invalid date range or period");
  }

  // Calculate the number of items to skip based on page and limit
  const skip = (page - 1) * limit;

  // Fetch the total count of matching orders
  const totalOrders = await Order.countDocuments({
    createdAt: { $gte: start.toDate(), $lte: end.toDate() },
    orderStatus: { $nin: ["Initiated", "Failed"] },
  });

  // Fetch paginated orders
  const orders = await Order.find(
    {
      createdAt: { $gte: start.toDate(), $lte: end.toDate() },
      orderStatus: { $nin: ["Initiated", "Failed"] },
    },
    {
      orderId: 1,
      billAmount: 1,
      appliedCouponAmount: 1,
      "items.appliedOfferAmount": 1,
      "payment.method": 1,
      "payment.status": 1,
      orderDate: 1,
    }
  )
    .skip(skip)
    .limit(limit);

  // If no orders are found
  if (orders.length === 0) {
    res.status(400);
    throw new Error("No orders found for the given date range");
  }

  return {
    orders,
    totalOrders,
    currentPage: page,
    totalPages: Math.ceil(totalOrders / limit),
  };
};

export default getPaginatedSalesReport;



////----------------------------------for pdf and xlsx----------------------------
export const getFullSalesReport = async (res) => {
  // Fetch all orders for metrics calculation
  const allOrders = await Order.find({
    orderStatus: { $nin: ["Initiated", "Failed"] },
  });

  // If no orders are found
  if (allOrders.length === 0) {
    res.status(400);
    throw new Error("No orders found");
  }

  // Calculate metrics
  const overallSalesCount = allOrders.length;
  const overallOrderAmount = allOrders.reduce(
    (acc, order) => acc + (order.billAmount || 0),
    0
  );
  const overallDiscount = allOrders.reduce(
    (acc, order) => acc + (order.appliedCouponAmount || 0),
    0
  );
  const totalDiscountOnMRP = allOrders.reduce(
    (acc, order) =>
      acc +
      order.items.reduce(
        (itemAcc, item) => itemAcc + (item.appliedOfferAmount || 0),
        0
      ),
    0
  );

  return {
    overallSalesCount,
    overallOrderAmount,
    overallDiscount,
    totalDiscountOnMRP,
    orders: allOrders,
    totalOrders: overallSalesCount, // Total orders
  };
};



