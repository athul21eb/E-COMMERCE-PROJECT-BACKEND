import Products from "../../models/products/products-model.js";
import BrandModel from "../../models/brand/brand-model.js";
import Category from "../../models/category/category-model.js";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";

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

    // Step 2: Populate category
    pipeline.push({
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    });

    // Step 3: Populate brand
    pipeline.push({
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brand",
      },
    });

    // Step 4: Unwind category and brand
    pipeline.push({ $unwind: "$category" });
    pipeline.push({ $unwind: "$brand" });

    // Step 5: Apply search filters if provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { productName: { $regex: search, $options: "i" } },
            { "category.categoryName": { $regex: search, $options: "i" } },
            { "brand.brandName": { $regex: search, $options: "i" } },
          ],
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

    const totalCount = totalCountResult.length ? totalCountResult[0].totalCount : 0;
console.log(totalCount)
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
    });

  // If no product found or the category/brand is not active
  if (!product || !product.category || !product.brand) {
    res.status(404);
    throw new Error("Product not found or associated category/brand is inactive");
  }

  // Fetch related products from the same category (up to 5)
  const relatedProducts = await Products.aggregate([
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
    { $unwind: "$brand" },
    { $unwind: "$category" },
    {
      $match: {
        "brand.isActive": true, // Ensure the brand is active
        "category.isActive": true, // Ensure the category is active
      },
    },
    { $limit: 5 }, // Limit to 5 related products
  ]);

 

  res.status(200).json({
    message: "Product retrieved successfully",
    product,
    relatedProducts,
  });
});


////----------------------------- Get new arrivals
export const getNewArrivals = expressAsyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  const now = new Date();

  const newArrivals = await Products.find({
    // createdAt: { $gte: new Date(now.setDate(now.getDate() - 60)) }, // New arrivals in the last 30 days
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
    });

  const activeProducts = newArrivals.filter(
    (product) => product.category && product.brand
  );

  if (!activeProducts.length) {
    res.status(404);
    throw new Error("No new arrivals found");
  }

  res.status(200).json({
    message: "New arrivals retrieved successfully",
    products: activeProducts,
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
    });

  const activeProducts = products.filter(
    (product) => product.category && product.brand
  )||[];

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
