import moment from "moment";
import Order from "../../models/order/order-model.js";

const getSalesReport = async (
  startDate,
  endDate,
  period,
  page = 1,
  limit = 10
) => {
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
    throw new Error("Invalid date range or period");
  }

  // Calculate the number of items to skip based on page and limit
  const skip = (page - 1) * limit;

  
  console.log("Start Date:", start.toDate());
console.log("End Date:", end.toDate());

  // Fetch the total count of orders (for total orders and total pages)
  const totalOrders = await Order.countDocuments({
    createdAt: { $gte: start.toDate(), $lte: end.toDate() },
    orderStatus: { $nin: ["Initiated", "Failed"] },
  });

  // Fetch orders with pagination
  const orders = await Order.find(
    {
      createdAt: { $gte: start.toDate(), $lte: end.toDate() },
      orderStatus: { $nin: ["Initiated", "Failed"] },
    },
    { orderId: 1, billAmount: 1, appliedCouponAmount: 1, 'items.appliedOfferAmount': 1, 'payment.method': 1,'payment.status': 1 ,orderDate:1 }
  )
    .skip(skip) // Skip the previous pages' orders
    .limit(limit); // Limit the number of orders per page

  // If no orders are found
  if (orders.length === 0) {
    throw new Error("No orders found for the given date range");
  }

  // Calculate metrics
  const overallSalesCount = orders.length;
  const overallOrderAmount = orders.reduce(
    (acc, order) => acc + (order.billAmount || 0),
    0
  );
  const overallDiscount = orders.reduce(
    (acc, order) => acc + (order.appliedCouponAmount || 0),
    0
  );
  const totalDiscountOnMRP = orders.reduce(
    (acc, order) =>
      acc +
      order.items.reduce(
        (itemAcc, item) => itemAcc + (item.appliedOfferAmount || 0),
        0
      ),
    0
  );

  // Calculate total pages
  const totalPages = Math.ceil(totalOrders / limit);
console.log(orders.length)
  return {
    overallSalesCount,
    overallOrderAmount,
    overallDiscount,
    totalDiscountOnMRP,
    orders,
    totalOrders, // Total orders (without pagination)
    totalPages, // Total pages based on pagination
    currentPage: page, // Current page being requested
  };
};

export default getSalesReport;
