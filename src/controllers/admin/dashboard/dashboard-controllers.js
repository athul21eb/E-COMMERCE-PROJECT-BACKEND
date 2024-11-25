import expressAsyncHandler from "express-async-handler";
import Order from "../../../models/order/order-model.js";
import Products from "../../../models/products/products-model.js";
import UserModel from "../../../models/user/user-model.js";
import constructGraphData from "../../../utils/helper/constructGraphData.js";
import moment from "moment";

export const getDashboardData = expressAsyncHandler(async (req, res) => {
  const { filter = "day", startDate, endDate } = req.query;

  // Define the date range filter based on query parameters
let dateFilter = {};

switch (filter) {
  case "day":
    dateFilter.orderDate = {
      $gte: moment().startOf("day").toDate(),
      $lt: moment().endOf("day").toDate(),
    };
    break;

  case "month":
    dateFilter.orderDate = {
      $gte: moment().startOf("month").toDate(),
      $lt: moment().endOf("month").toDate(),
    };
    break;

  case "year":
    dateFilter.orderDate = {
      $gte: moment().startOf("year").toDate(),
      $lt: moment().endOf("year").toDate(),
    };
    break;

  case "all":
    dateFilter.orderDate = {
      $lt: moment().toDate(),
    };
    break;

  default:
    if (startDate && endDate) {
      dateFilter.orderDate = {
        $gte: moment(startDate).toDate(),
        $lte: moment(endDate).toDate(),
      };
    }else{
      res.status(400);
      throw new Error("wrong filter is entered")
    }
    break;
}

  console.log(dateFilter);
  try {
    // Fetch Total Users
    const totalUsers = await UserModel.countDocuments({
      "timestamps.createdAt": dateFilter.orderDate,
    });

    // Fetch Total Orders
    const totalOrders = await Order.countDocuments({
      orderStatus: { $nin: ["Initiated", "Failed"]},
      orderDate: dateFilter.orderDate,
    });

    // Fetch Total Revenue
    const totalRevenueResult = await Order.aggregate([
      { $match: { "payment.status": "Success", ...dateFilter } },
      {
        $group: {
          _id: null,
          totalBillAmount: { $sum: "$billAmount" },totalRefund: { $sum: "$refundedAmount" },
        },
      },
    ]);
    const totalBillAmount = totalRevenueResult[0]?.totalBillAmount || 0;
    const totalRefund = totalRevenueResult[0]?.totalRefund || 0;

    const totalRevenue = totalBillAmount - totalRefund || 0;

    console.log(totalRevenueResult);

    // Fetch Total Products
    const totalProducts = await Products.countDocuments({
      createdAt: dateFilter.orderDate,
    });

    // Fetch Top Brands by Items Sold
    const topBrands = await Order.aggregate([
      { $match: { orderStatus: { $nin: ["Initiated", "Failed"]}, ...dateFilter } },
      { $unwind: "$items" }, // Unwind items
      {
        $lookup: {
          from: "products", // Link to Products collection
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "brands", // Link to Brands collection
          localField: "productDetails.brand",
          foreignField: "_id",
          as: "brandDetails",
        },
      },
      { $unwind: "$brandDetails" },
      {
        $group: {
          _id: "$brandDetails._id",
          brandName: { $first: "$brandDetails.brandName" },
          brandPhotoUrl: { $first: "$brandDetails.brandPhotoUrl" },
          totalSold: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);

    const topCategories = await Order.aggregate([
      { $match: { orderStatus: { $nin: ["Initiated", "Failed"]}, ...dateFilter } }, // Filter orders
      { $unwind: "$items" }, // Unwind items array
      {
        $lookup: {
          from: "products", // Link to Products collection
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "categories", // Link to Categories collection
          localField: "productDetails.category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      {
        $group: {
          _id: "$categoryDetails._id",
          categoryName: { $first: "$categoryDetails.categoryName" },
          categoryDescription: {
            $first: "$categoryDetails.categoryDescription",
          },
          totalSold: { $sum: "$items.quantity" }, // Sum up quantities
        },
      },
      { $sort: { totalSold: -1 } }, // Sort by totalSold in descending order
      { $limit: 10 }, // Limit to top 10 categories
    ]);

    // Fetch Top 10 Products by Sales
    const topProducts = await Order.aggregate([
      { $match: { orderStatus: { $nin: ["Initiated", "Failed"]}, ...dateFilter } }, // Match orders within the date range
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          _id: 0,
          totalSold: 1,
          "productDetails.productName": 1,
          "productDetails.thumbnail": 1,
        },
      },
    ]);

    const itemStatusCounts = await Order.aggregate([
      { $match: { orderStatus: { $nin: ["Initiated", "Failed"]}, ...dateFilter } },
      { $unwind: "$items" }, // Flatten the items array
      {
        $group: {
          _id: "$items.status", // Group by item status
          count: { $sum: 1 }, // Count the occurrences of each status
        },
      },
      { $sort: { count: -1 } }, // Sort by count descending
    ]);

    // Format the data for the pie chart
    const pieData = itemStatusCounts.map((status) => ({
      status: status._id,
      count: status.count,
    }));

    res.status(200).json({
      totalUsers,
      totalOrders,
      totalRevenue,
      totalProducts,
      topCategories,
      topBrands,
      topProducts,
      pieData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export const getBarGraphData = expressAsyncHandler(async (req, res) => {
  const { period = "monthly" } = req.query;

  let groupBy;
  if (period === "weekly") {
    groupBy = { day: { $dayOfWeek: "$orderDate" } }; // Group by day of the week
  } else {
    groupBy = { month: { $month: "$orderDate" } }; // Group by month
  }

  // Fetch total revenue grouped by period
  const revenueData = await Order.aggregate([
    { $match: { "payment.status": "Success" } },
    { $group: { _id: groupBy,   totalBillAmount: { $sum: "$billAmount" },totalRefund: { $sum: "$refundedAmount" },} },
    { $sort: { "_id.month": 1, "_id.day": 1 } }, // Ensure sorting by time
  ]);

  // Format the data for the graph
  const graphData = constructGraphData(
    period === "weekly" ? "week" : "month",
    revenueData.map((item) => ({
      ...(item._id || {}),
      revenue: item.totalBillAmount-item.totalRefund,
    }))
  );

  res.status(200).json(graphData);
});

export const getPieChartData = expressAsyncHandler(async (req, res) => {
  // Fetch order status counts
  // Aggregate item status counts

  const itemStatusCounts = await Order.aggregate([
    { $unwind: "$items" }, // Flatten the items array
    {
      $group: {
        _id: "$items.status", // Group by item status
        count: { $sum: 1 }, // Count the occurrences of each status
      },
    },
    { $sort: { count: -1 } }, // Sort by count descending
  ]);

  // Format the data for the pie chart
  const pieData = itemStatusCounts.map((status) => ({
    status: status._id,
    count: status.count,
  }));
  res.status(200).json(pieData);
});
