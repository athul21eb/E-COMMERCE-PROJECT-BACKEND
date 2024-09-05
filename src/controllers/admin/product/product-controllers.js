import expressAsyncHandler from "express-async-handler";

import Products from "./../../../models/products/products-model.js";
///* @desc   Create a new product
///? @access Private

const createProduct = expressAsyncHandler(async (req, res) => {
  const {
    productName,
    description,
    category,
    brand,

    stock,
    regularPrice,

    salePrice,
    thumbnail,
    gallery,
  } = req.body;

  // Validation
  if (
    !productName ||
    !description ||
    !category ||
    !brand ||
    !regularPrice ||
    !salePrice ||
    !thumbnail
  ) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }

  // Transform productName to desired format
  const transformedProductName =
    productName.charAt(0).toUpperCase() + productName.slice(1).toLowerCase();

  // Check if the product already exists
  const existingProduct = await Products.findOne({
    productName: transformedProductName,
  });
  if (existingProduct) {
    res.status(400);
    throw new Error("Product already exists");
  }
  
// Sort the stock array in descending order of size
stock.sort((a, b) => b.size - a.size);
  // Create new product
  const newProduct = await Products.create({
    productName: transformedProductName,
    description,
    category,
    brand,

    stock,
    regularPrice,

    salePrice,
    thumbnail,
    gallery,
  });

  if (newProduct) {
    res.status(201).json({
      message: "Product created successfully",
      product: newProduct,
    });
  } else {
    res.status(500);
    throw new Error("Server error: Product could not be created");
  }
});

////-------------------------------route => GET/get-products----------------------------------------------
///* @desc   Get all products
///? @access Private

const getProducts = expressAsyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1; // Current page number, default to 1
  const limit = Number(req.query.limit) || 10; // Products per page, default to 10
  const skip = (page - 1) * limit; // Calculate how many products to skip

  const totalProductsCount = await Products.countDocuments({
    deletedAt: { $exists: false }, // Exclude soft-deleted products
  });

  const products = await Products.find({
    deletedAt: { $exists: false }, // Exclude soft-deleted products
  })
    .populate("category")
    .populate("brand")
    .skip(skip) // Skip the necessary products
    .limit(limit); // Limit the number of products retrieved

  if (!products.length) {
    res.status(404);
    throw new Error("No products found");
  }

  res.json({
    message: "Products retrieved successfully",
    products,

    totalProductsCount, // Calculate total pages
  });
});

////-------------------------------route => PUT/update-product----------------------------------------------
///* @desc  Update product
///? @access Private

const updateProduct = expressAsyncHandler(async (req, res) => {
  const {
    productId,
    productName,
    description,
    category,
    brand,
    stock,
    regularPrice,
    salePrice,
    thumbnail,
    gallery,
  } = req.body;

  if (
    !productId ||
    !productName ||
    !description ||
    !category ||
    !brand ||
    !regularPrice ||
    !salePrice ||
    !thumbnail
  ) {
    res.status(400);

    throw new Error("Please fill in all required fields");
  }

  // Transform productName to desired format
  const transformedProductName =
    productName.charAt(0).toUpperCase() + productName.slice(1).toLowerCase();
// Sort the stock array in descending order of size
stock.sort((a, b) => b.size - a.size);


  const productData = await Products.findByIdAndUpdate(
    productId,
    {
      productName: transformedProductName,
      description,
      category,
      brand,

      stock,
      regularPrice,

      salePrice,
      thumbnail,
      gallery,
    },
    { new: true }
  );

  if (productData) {
    res.json({
      message: ` ${productData.productName} - Product updated successfully `,
      product: productData,
    });
  } else {
    res.status(500);
    throw new Error("Server error: Product could not be updated");
  }
});

////-------------------------------route => PATCH/update-product-isActive----------------------------------------------
///* @desc  Update product isActive status
///? @access Private

const updateProductIsActive = expressAsyncHandler(async (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    res.status(400);
    throw new Error("Please provide a product ID");
  }

  const foundProduct = await Products.findById(productId);

  if (!foundProduct) {
    res.status(404);
    throw new Error("Product Not Found");
  }

  const productData = await Products.findByIdAndUpdate(
    productId,
    { $set: { isActive: !foundProduct.isActive } }, // Toggles the current value
    { new: true }
  );

  if (productData) {
    res.json({
      message: `Product isActive status updated successfully`,
      product: productData,
    });
  } else {
    res.status(500);
    throw new Error("Server error: Product status could not be updated");
  }
});

////-------------------------------route => DELETE/delete-product----------------------------------------------
///* @desc   Soft delete product
///? @access Private

const deleteProduct = expressAsyncHandler(async (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    res.status(400);
    throw new Error("Please provide a product ID");
  }

  const foundProduct = await Products.findById(productId);

  if (!foundProduct) {
    res.status(404);
    throw new Error("Product Not Found");
  }

  const productData = await Products.findByIdAndUpdate(
    productId,
    { $set: { deletedAt: new Date(), isActive: false } }, // Set deletedAt and block the product
    { new: true }
  );

  if (productData) {
    res.json({
      message: "Product soft deleted successfully",
      product: productData,
    });
  } else {
    res.status(500);
    throw new Error("Server error: Product could not be deleted");
  }
});

////-------------------------------route => get/get-product/:id----------------------------------------------
///* @desc  get  product by id
///? @access Private

const getProductById = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;

  // Fetch the product by id, making sure it's not soft-deleted
  const product = await Products.findOne({
    _id: id,
    deletedAt: { $exists: false },
  })
    .populate("category")
    .populate("brand");

  if (!product) {
    res.status(404);
    throw new Error("No products found");
  }

  res.json({
    message: "Product retrieved successfully",
    product,
  });
});

export {
  createProduct,
  getProducts,
  updateProduct,
  updateProductIsActive,
  deleteProduct,
  getProductById,
};
