import Products from "../../models/products/products-model.js";
import BrandModel from "../../models/brand/brand-model.js";
import expressAsyncHandler from "express-async-handler";

//-------------------------------route => GET/get-products----------------------------------------------
///* @desc   Get all products
///? @access

export const getAllProducts = expressAsyncHandler(async (req, res) => {
  const products = await Products.find({
    deletedAt: { $exists: false },
    isActive: true,
  })
  .populate({
    path: "category",
    match: { isActive: true }, // Ensure the category is active
  })
  .populate({
    path: "brand",
    match: { isActive: true }, // Ensure the brand is active
  });

  // Filter out products where either the category or brand is not active
  const activeProducts = products.filter(product => product.category && product.brand);

  if (!activeProducts.length) {
    res.status(404);
    throw new Error("No products found");
  }

  res.status(200).json({
    message: "Products retrieved successfully",
    products: activeProducts,
  });
});


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


//-------------------------------route => GET/product/:id----------------------------------------------
///* @desc   Get product by ID
///? @access

export const getProductById = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;

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

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.status(200).json({
    message: "Product retrieved successfully",
    product,
  });
});
