import Products from "../../models/products/products-model.js";
import BrandModel from "../../models/brand/brand-model.js";
import Category from "../../models/category/category-model.js";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import wishList from "../../models/wishList/wishlist-model.js";
import Order from "../../models/order/order-model.js";
import { BannerModel } from "../../models/banner/banner-model.js";

export const getAllProductsWithFilters = expressAsyncHandler(
  async (req, res) => {
    const {
      page = 1,
      limit = 10,
      selectedBrands,
      minPrice = 500,
      maxPrice = 40000,
      sortBy = "",
      search = "",
      selectedCategoryName = "",
    } = req.query;

    const skip = (page - 1) * limit;

    const pipeline = [];

    // Step 1: Match basic filters (isActive, price range, etc.)
    pipeline.push({
      $match: {
        deletedAt: { $exists: false },
        isActive: true,
        salePrice: { $gte: Number(minPrice), $lte: Number(maxPrice) },
      },
    });

    // Step 2: Populate category and check if the category is active
    pipeline.push({
      $lookup: {
        from: "categories",
        let: { categoryId: "$category" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$_id", "$$categoryId"] },
                  { $eq: ["$isActive", true] },
                ],
              },
            },
          },
        ],
        as: "category",
      },
    });

    // Step 3: Populate brand and check if the brand is active
    pipeline.push({
      $lookup: {
        from: "brands",
        let: { brandId: "$brand" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$_id", "$$brandId"] },
                  { $eq: ["$isActive", true] },
                ],
              },
            },
          },
        ],
        as: "brand",
      },
    });

    // Step 4: Populate offer
    pipeline.push({
      $lookup: {
        from: "offers",
        localField: "offer",
        foreignField: "_id",
        as: "offer",
      },
    });

    // Step 5: Unwind category and brand
    pipeline.push({ $unwind: "$category" });
    pipeline.push({ $unwind: "$brand" });
    pipeline.push({
      $unwind: { path: "$offer", preserveNullAndEmptyArrays: true },
    });

    // Step 5: Apply search filters if provided
    // if (search) {
    //   pipeline.push({
    //     $match: {
    //       $or: [
    //         { productName: { $regex: search, $options: "i" } },
    //         { "category.categoryName": { $regex: search, $options: "i" } },
    //         { "brand.brandName": { $regex: search, $options: "i" } },
    //       ],
    //     },
    //   });
    // }
    if (search) {
      // Split the search string into individual words
      const keywords = search.split("").filter(Boolean); // Remove empty strings

      // Create $or conditions for each keyword
      const orConditions = keywords.map((keyword) => ({
        $or: [
          { productName: { $regex: keyword, $options: "i" } },
          { "category.categoryName": { $regex: keyword, $options: "i" } },
          { "brand.brandName": { $regex: keyword, $options: "i" } },
        ],
      }));

      pipeline.push({
        $match: {
          $and: orConditions,
        },
      });
    }

    // Step 6: Filter by selected brands
    if (selectedBrands) {
      const selectedBrandsArray = selectedBrands
        .split(",")
        .filter((brandId) => mongoose.Types.ObjectId.isValid(brandId))
        .map((brandId) => new mongoose.Types.ObjectId(brandId));

      if (selectedBrandsArray.length) {
        pipeline.push({
          $match: { "brand._id": { $in: selectedBrandsArray } },
        });
      }
    }

    if (selectedCategoryName) {
      pipeline.push({
        $match: { "category.categoryName": selectedCategoryName },
      });
    }

    // Step 7: Create a copy of the pipeline to count total products
    const totalCountPipeline = [...pipeline, { $count: "totalCount" }];
    const totalCountResult = await Products.aggregate(totalCountPipeline);

    const totalCount = totalCountResult.length
      ? totalCountResult[0].totalCount
      : 0;
  
    // Step 8: Apply pagination (skip and limit)
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: Number(limit) });

    // Step 9: Sorting
    const sortOptions = getSortOptions(sortBy);
    pipeline.push({ $sort: sortOptions });

    // Execute final pipeline to get products
    const products = await Products.aggregate(pipeline);

    if (!products.length) {
      res.status(404).json({ message: "No products found" });
      return;
    }

    res.status(200).json({
      message: "Products retrieved successfully",
      products,
      totalCount, // Now this represents the total products count before pagination
      page: Number(page),
      limit: Number(limit),
    });
  }
);

// Helper function for sorting
function getSortOptions(sortBy) {
  switch (sortBy) {
    case "aA-zZ":
      return { productName: 1 };
    case "zZ-aA":
      return { productName: -1 };
    case "Price: Low to High":
      return { salePrice: 1 };
    case "Price: High to Low":
      return { salePrice: -1 };
    case "Newest":
      return { createdAt: -1 };
    default:
      return { createdAt: 1 };
  }
}

////-------------------------------route => GET/get-brands----------------------------------------------
///* @desc   Get all brands
///? @access

export const getAllBrands = expressAsyncHandler(async (req, res) => {
  const allBrands = await BrandModel.find({
    deletedAt: { $exists: false },
    isActive: true,
  });

  if (!allBrands.length) {
    res.status(404);
    throw new Error("No brands found");
  }

  res.status(200).json({
    message: "Brands retrieved successfully",
    brands: allBrands,
  });
});

////-------------------------------route => GET/product/:id----------------------------------------------
///* @desc   Get product by ID
///? @access
export const getProductById = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;

  // Fetch the product by id with active category and brand
  const product = await Products.findOne({
    _id: id,
    deletedAt: { $exists: false }, // Ensuring the product is not soft-deleted
    isActive: true, // Ensure the product is active
  })
    .populate({
      path: "category",
      match: { isActive: true }, // Ensure the category is active
    })
    .populate({
      path: "brand",
      match: { isActive: true }, // Ensure the brand is active
    })
    .populate("offer");

  // If no product found or the category/brand is not active
  if (!product || !product.category || !product.brand) {
    res.status(404);
    throw new Error(
      "Product not found or associated category/brand is inactive"
    );
  }

  // Fetch related products from the same category (up to 5)
  let relatedProducts = await Products.aggregate([
    {
      $match: {
        deletedAt: { $exists: false }, // Not soft-deleted
        isActive: true, // Only active products
        category: product.category._id, // Same category as the current product
        _id: { $ne: product._id }, // Exclude the current product
      },
    },
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brand",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $lookup: {
        from: "offers",
        localField: "offer",
        foreignField: "_id",
        as: "offer",
      },
    },
    { $unwind: "$brand" },
    { $unwind: "$category" },
    { $unwind: { path: "$offer", preserveNullAndEmptyArrays: true } },
    {
      $match: {
        "brand.isActive": true, // Ensure the brand is active
        "category.isActive": true, // Ensure the category is active
      },
    },
    { $limit: 5 }, // Limit to 5 related products
  ]);

  // If no related products are found, fetch fallback products from other categories
  if (!relatedProducts.length) {
    relatedProducts = await Products.aggregate([
      {
        $match: {
          deletedAt: { $exists: false }, // Not soft-deleted
          isActive: true, // Only active products
          _id: { $ne: product._id }, // Exclude the current product
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "offers",
          localField: "offer",
          foreignField: "_id",
          as: "offer",
        },
      },
      { $unwind: "$brand" },
      { $unwind: "$category" },
      { $unwind: { path: "$offer", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "brand.isActive": true, // Ensure the brand is active
          "category.isActive": true, // Ensure the category is active
        },
      },
      { $limit: 5 }, // Limit to 5 fallback products
    ]);
  }

  res.status(200).json({
    message: "Product retrieved successfully",
    product,
    relatedProducts,
  });
});

////----------------------------- Get new arrivals--------------------

export const getNewArrivals = expressAsyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  // Get new arrivals
  const newArrivals = await Products.find({
    deletedAt: { $exists: false },
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate({
      path: "category",
      match: { isActive: true },
    })
    .populate({
      path: "brand",
      match: { isActive: true },
    })
    .populate("offer");

  const activeProducts = newArrivals.filter(
    (product) => product.category && product.brand
  );

  if (!activeProducts.length) {
    res.status(404);
    throw new Error("No new arrivals found");
  }

  // Get the two most wishlist products
  let mostWishlistProducts = await wishList.aggregate([
    { $unwind: "$products" },
    { $group: { _id: "$products", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 2 },
    {
      $lookup: {
        from: "products", // Assuming the products collection is named 'products'
        localField: "_id",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    { $unwind: "$productDetails" },
    { $replaceRoot: { newRoot: "$productDetails" } },
  ]);

  // If no wishlist products, take two from new arrivals
  if (mostWishlistProducts.length < 2) {
    mostWishlistProducts = activeProducts.slice(0, 2);
  }

  // Get the two most delivered products
  let mostDeliveredProducts = await Order.aggregate([
    { $unwind: "$items" },
    {
      $match: {
        "items.status": "Delivered",
      },
    },
    { $group: { _id: "$items.productId", count: { $sum: "$items.quantity" } } },
    { $sort: { count: -1 } },
    { $limit: 2 },
    {
      $lookup: {
        from: "products", // Assuming the products collection is named 'products'
        localField: "_id",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    { $unwind: "$productDetails" },
    { $replaceRoot: { newRoot: "$productDetails" } },
  ]);

  // If no delivered products, take two from new arrivals
  if (mostDeliveredProducts.length < 2) {
    mostDeliveredProducts = activeProducts.slice(2, 4);
  }

  const banners = await BannerModel.find({ isActive: true });
  // Return the response with new arrivals, most wishlist, and most delivered products
  res.status(200).json({
    message:
      "New arrivals, most wishlist, and most delivered products retrieved successfully",
    newArrivals: activeProducts,
    mostLoved: mostWishlistProducts,
    mostDelivered: mostDeliveredProducts,
    banners: banners && banners.length > 0 ? banners : [],
    page: Number(page),
    limit: Number(limit),
  });
});

// Get products by category with pagination
export const getProductsByCategory = expressAsyncHandler(async (req, res) => {
  const { categoryName } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const products = await Products.find({
    deletedAt: { $exists: false },
    isActive: true,
    category: {
      $exists: true,
      $in: await Category.find({ categoryName, isActive: true }).select("_id"),
    },
  })
    .skip(skip)
    .limit(Number(limit))
    .populate({
      path: "category",
      match: { isActive: true },
    })
    .populate({
      path: "brand",
      match: { isActive: true },
    })
    .populate("offer");

  const activeProducts =
    products.filter((product) => product.category && product.brand) || [];

  if (!activeProducts.length) {
    res.status(404);
    throw new Error(`No products found for category: ${categoryName}`);
  }

  res.status(200).json({
    message: `Products for category '${categoryName}' retrieved successfully`,
    products: activeProducts,
    page: Number(page),
    limit: Number(limit),
  });
});
