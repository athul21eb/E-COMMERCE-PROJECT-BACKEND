import expressAsyncHandler from "express-async-handler";

import BrandModel from './../../../models/brand/brand-model.js';

////-------------------------------route => POST/v1/admin/brand/create-brand----------------------------------------------
///* @desc   Add brand
///? @access Private

const createBrand = expressAsyncHandler(async (req, res) => {
  let { brandName, brandDescription, brandPhotoUrl } = req.body;

  ////Validation
  if (!brandName || !brandDescription || !brandPhotoUrl) {
    res.status(400);
    throw new Error("Please fill in all fields");
  }

  ////Transform to desired format (First letter uppercase, rest lowercase)
  brandName =
    brandName.charAt(0).toUpperCase() + brandName.slice(1).toLowerCase();

  ////Check if the brand already exists (excluding soft-deleted brands)
  const existingBrand = await BrandModel.findOne({
    brandName,
    deletedAt: { $exists: false },
  });
  if (existingBrand) {
    res.status(400);
    throw new Error("Brand already exists");
  }

  ////Create new brand
  const createdBrand = await BrandModel.create({
    brandName,
    brandDescription,
    brandPhotoUrl,
  });

  if (createdBrand) {
    const { _id, brandName, brandDescription, brandPhotoUrl, isActive } =
      createdBrand;
    res.json({
      message: "Brand created successfully",
      brand: { _id, brandName, brandDescription, brandPhotoUrl, isActive },
    });
  } else {
    res.status(500);
    throw new Error("Server error: Brand could not be created");
  }
});

////-------------------------------route => GET/v1/admin/brand/get-brands----------------------------------------------
///* @desc   Get all brands
///? @access Private
const getBrands = expressAsyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1; // Current page number, default to 1
  const limit = Number(req.query.limit) || 10; // Brands per page, default to 10
  const skip = (page - 1) * limit; // Calculate how many brands to skip

  // Get the total number of brands excluding soft-deleted ones
  const totalBrandsCount = await BrandModel.countDocuments({
    deletedAt: { $exists: false },
  });

  // Fetch the brands with pagination, excluding soft-deleted ones
  const brands = await BrandModel.find({
    deletedAt: { $exists: false },
  })
    .skip(skip) // Skip the necessary brands
    .limit(limit); // Limit the number of brands retrieved

  if (!brands.length) {
    res.status(404);
    throw new Error("No brands found");
  }

  res.json({
    message: "Brands retrieved successfully",
    brands,
    totalBrandsCount, // Include the total count for pagination
  });
});


////-------------------------------route => PUT/v1/admin/brand/update-brand----------------------------------------------

///* @desc  Update brand

///? @access Private

const updateBrand = expressAsyncHandler(async (req, res) => {
  let { brandId, brandName, brandDescription, brandPhotoUrl } = req.body;

  console.log(brandId, brandName, brandDescription, brandPhotoUrl);
  

  if (!brandId || !brandName || !brandDescription || !brandPhotoUrl) {
    res.status(400);
    throw new Error("Please fill in all fields");
  }

  const foundBrand = await BrandModel.findById(brandId);

  if (!foundBrand) {
    res.status(404);
    throw new Error("Brand Not Found");
  }

  ////Transform to desired format (First letter uppercase, rest lowercase)
  brandName =
    brandName.charAt(0).toUpperCase() + brandName.slice(1).toLowerCase();

  ////Check for existing brand with the same name (excluding soft-deleted brands)
  const existingBrand = await BrandModel.findOne({
    brandName,
    _id: { $ne: brandId },
    deletedAt: { $exists: false },
  });
  if (existingBrand) {
    res.status(400);
    throw new Error("Brand name already exists");
  }

  const brandData = await BrandModel.findByIdAndUpdate(
    brandId,
    {
      brandName,
      brandDescription,
      brandPhotoUrl,
    },
    { new: true }
  );

  if (brandData) {
    res.json({
      message: `${brandData.brandName} - Brand updated successfully` ,
      brand: brandData,
    });
  } else {
    res.status(500);
    throw new Error("Server error: Brand could not be updated");
  }
});

////-------------------------------route => PATCH/v1/admin/brand/update-brand-isActive----------------------------------------------
///* @desc  Update brand isActive status
///? @access Private

const updateBrandIsActive = expressAsyncHandler(async (req, res) => {
  let { brandId } = req.body;

  if (!brandId) {


    res.status(400);


    throw new Error("Please provide a brand ID");
  }

  const foundBrand = await BrandModel.findById(brandId);

  if (!foundBrand) {
    res.status(404);
    throw new Error("Brand Not Found");
  }

  const brandData = await BrandModel.findByIdAndUpdate(
    brandId,
    { $set: { isActive: !foundBrand.isActive } }, ////Toggles the current value
    { new: true }
  );

  if (brandData) {
    res.json({
      message: `${brandData.brandName} - Brand isActive status updated successfully`,
      brand: brandData,
    });
  } else {
    res.status(500);
    throw new Error("Server error: Brand status could not be updated");
  }
});

////-------------------------------route => DELETE/v1/admin/brand/delete-brand----------------------------------------------
///* @desc   Soft delete brand
///? @access Private

const deleteBrand = expressAsyncHandler(async (req, res) => {
  let { brandId } = req.body;

  if (!brandId) {
    res.status(400);
    throw new Error("Please provide a brand ID");
  }

  const foundBrand = await BrandModel.findById(brandId);

  if (!foundBrand) {
    res.status(404);
    throw new Error("Brand Not Found");
  }

  ////Soft delete the brand by setting deletedAt to the current date
  const brandData = await BrandModel.findByIdAndUpdate(
    brandId,
    { $set: { deletedAt: new Date(), isActive: false } }, ////Set deletedAt and deactivate
    { new: true }
  );

  if (brandData) {
    res.json({
      message: "Brand soft deleted successfully",
      brand: brandData,
    });
  } else {
    res.status(500);
    throw new Error("Server error: Brand could not be deleted");
  }
});
////-------------------------------route => GET/v1/admin/brand/get-brands----------------------------------------------
//* @desc   Get all brands
//? @access Private
const getAllBrands = expressAsyncHandler(async (req, res) => {
  // Fetch all brands excluding soft-deleted ones
  const brands = await BrandModel.find({
    deletedAt: { $exists: false },
  });

  if (!brands.length) {
    res.status(404);
    throw new Error("No brands found");
  }

  res.json({
    message: "Brands retrieved successfully",
    brands,
  });
});


export {
  createBrand,
  getBrands,
  updateBrand,
  updateBrandIsActive,
  deleteBrand,
  getAllBrands
};
