import expressAsyncHandler from "express-async-handler";

import CategoryModel from './../../../models/category/category-model.js';
import Products from "../../../models/products/products-model.js";

//// -------------------------------route => POST/v1/admin/category/create-category----------------------------------------------
///* @desc   Add category
///? @access Private

const createCategory = expressAsyncHandler(async (req, res) => {
  let { categoryName, categoryDescription } = req.body;

  //// Validation
  if (!categoryDescription || !categoryName) {
    res.status(400);
    throw new Error("Please fill in all fields");
  }

  // Transform to desired format (First letter uppercase, rest lowercase)
  categoryName =
    categoryName.charAt(0).toUpperCase() + categoryName.slice(1).toLowerCase();

  // Check if the category already exists (excluding soft-deleted categories)
  const existingCategory = await CategoryModel.findOne({
    categoryName,
    deletedAt: { $exists: false },
  });
  if (existingCategory) {
    res.status(400);
    throw new Error("Category already exists");
  }

  // Create new category
  const createdCategory = await CategoryModel.create({
    categoryName,
    categoryDescription,
  });

  if (createdCategory) {
    const { _id, categoryDescription, categoryName, isActive } =
      createdCategory;
    res.json({
      message: "Category created successfully",
      category: { _id, categoryDescription, categoryName, isActive },
    });
  } else {
    res.status(500);
    throw new Error("Server error: Category could not be created");
  }
});

//// -------------------------------route => POST/v1/admin/category/get-categories----------------------------------------------
///* @desc   Get all categories
///? @access Private

const getCategories = expressAsyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1; // Current page number, default to 1
  const limit = Number(req.query.limit) || 10; // Categories per page, default to 10
  const skip = (page - 1) * limit; // Calculate how many categories to skip

  // Get the total number of categories excluding soft-deleted ones
  const totalCategoriesCount = await CategoryModel.countDocuments({
    deletedAt: { $exists: false },
  });

  // Fetch the categories with pagination, excluding soft-deleted ones
  const categories = await CategoryModel.find({
    deletedAt: { $exists: false },
  })
    .skip(skip) // Skip the necessary categories
    .limit(limit); // Limit the number of categories retrieved

  if (!categories.length) {
    res.status(404);
    throw new Error("No categories found");
  }

  res.status(200).json({
    message: "Categories retrieved successfully",
    categories,
    totalCategoriesCount, // Include the total count for pagination
  });
});


//// -------------------------------route => POST/v1/admin/category/update-category----------------------------------------------
///* @desc  Update categories
///? @access Private

const updateCategory = expressAsyncHandler(async (req, res) => {
  let { categoryId, categoryName, categoryDescription } = req.body;

  if (!categoryDescription || !categoryId || !categoryName) {
    res.status(400);
    throw new Error("Please fill in all fields");
  }

  const foundCategory = await CategoryModel.findById(categoryId);

  if (!foundCategory) {
    res.status(404);
    throw new Error("Category Not Found");
  }

  // Transform to desired format (First letter uppercase, rest lowercase)
  categoryName =
    categoryName.charAt(0).toUpperCase() + categoryName.slice(1).toLowerCase();

  // Check for existing category with the same name (excluding soft-deleted categories)
  const existingCategory = await CategoryModel.findOne({
    categoryName,
    _id: { $ne: categoryId },
    deletedAt: { $exists: false },
  });
  if (existingCategory) {
    res.status(400);
    throw new Error("Category name already exists");
  }

  const categoryData = await CategoryModel.findByIdAndUpdate(
    categoryId,
    {
      categoryName,
      categoryDescription,
    },
    { new: true }
  );

  if (categoryData) {
    res.json({
      message: "Category updated successfully",
      category: categoryData,
    });
  } else {
    res.status(500);
    throw new Error("Server error: Category could not be updated");
  }
});

//// -------------------------------route => POST/v1/admin/category/update-category-isActive----------------------------------------------
///* @desc  Update category isActive status
///? @access Private

const updateCategoryIsActive = expressAsyncHandler(async (req, res) => {
  let { categoryId } = req.body;

  if (!categoryId) {
    res.status(400);
    throw new Error("Please provide a category ID");
  }

  const foundCategory = await CategoryModel.findById(categoryId);

  if (!foundCategory) {
    res.status(404);
    throw new Error("Category Not Found");
  }

  const categoryData = await CategoryModel.findByIdAndUpdate(
    categoryId,
    { $set: { isActive: !foundCategory.isActive } }, // Toggles the current value
    { new: true }
  );

 
  
  
  if (categoryData ) {

    // if(!categoryData.isActive){

    //   const productData = await Products.updateMany(
    //     {category:categoryData._id},
    //     { $set: { isActive: false } }, // Toggles the current value
    //     { new: true }
    //   );
    // }
    res.json({
      message: `Category isActive status updated successfully `,
      category: categoryData,
    });

}else {
    res.status(500);
    throw new Error("Server error: Category status could not be updated");
  }
});

//// -------------------------------route => POST/v1/admin/category/delete-category----------------------------------------------
///* @desc   Soft delete category
///? @access Private

const deleteCategory = expressAsyncHandler(async (req, res) => {
  let { categoryId } = req.body;

  if (!categoryId) {
    res.status(400);
    throw new Error("Please provide a category ID");
  }

  const foundCategory = await CategoryModel.findById(categoryId);

  if (!foundCategory) {
    res.status(404);
    throw new Error("Category Not Found");
  }

  // Soft delete the category by setting deletedAt to the current date
  const categoryData = await CategoryModel.findByIdAndUpdate(
    categoryId,
    { $set: { deletedAt: new Date(), isActive: false } }, // Set deletedAt and deactivate
    { new: true }
  );

  if (categoryData) {
    res.json({
      message: "Category soft deleted successfully",
      category: categoryData,
    });
  } else {
    res.status(500);
    throw new Error("Server error: Category could not be deleted");
  }
});

//// -------------------------------route => POST/v1/admin/category/get-all-categories----------------------------------------------
///* @desc   Get all categories
///? @access Private
const getAllCategories = expressAsyncHandler(async (req, res) => {
  // Fetch all categories excluding soft-deleted ones
  const categories = await CategoryModel.find({
    deletedAt: { $exists: false },
  });

  if (!categories.length) {
    res.status(404);
    throw new Error("No categories found");
  }

  res.status(200).json({
    message: "Categories retrieved successfully",
    categories,
  });
});


export {
  createCategory,
  getCategories,
  updateCategory,
  updateCategoryIsActive,
  deleteCategory,
  getAllCategories
};
