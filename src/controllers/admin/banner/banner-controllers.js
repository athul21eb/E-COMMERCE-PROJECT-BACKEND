import expressAsyncHandler from "express-async-handler";
import { BannerModel } from "../../../models/banner/banner-model.js";
import mongoose from "mongoose";

////-------------------------------route => POST/v1/admin/banner/create-banner----------------------------------------------
///* @desc   Add banner
///? @access Private
const createBanner = expressAsyncHandler(async (req, res) => {
  const { product, title, subTitle, image } = req.body;

  // Validation
  if (!product || !title || !subTitle || !image) {
    res.status(400);
    throw new Error("Please fill in all fields");
  }

  // Create new banner
  const createdBanner = await BannerModel.create({ product, title, subTitle, image });

  if (createdBanner) {
    res.json({
      message: "Banner created successfully",
      banner: createdBanner,
    });
  } else {
    res.status(500);
    throw new Error("Server error: Banner could not be created");
  }
});

////-------------------------------route => GET/v1/admin/banner/get-banners----------------------------------------------
///* @desc   Get all banners
///? @access Private
const getBanners = expressAsyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const totalBannersCount = await BannerModel.countDocuments();

  const banners = await BannerModel.find()
    .skip(skip)
    .limit(limit)
    .populate("product");

  if (!banners.length) {
    res.status(404);
    throw new Error("No banners found");
  }

  res.json({
    message: "Banners retrieved successfully",
    banners,
    totalBannersCount,
  });
});


////-------------------------------route => PATCH/v1/admin/banner/update-banner-isActive-----------------------------------
///* @desc   Update banner isActive status
///? @access Private
const updateBannerIsActive = expressAsyncHandler(async (req, res) => {
    const { bannerId } = req.body;
  
    if (!bannerId) {
      res.status(400);
      throw new Error("Please provide a banner ID");
    }
  
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(bannerId)) {
    res.status(400);
    throw new Error("Invalid banner ID format");
  }
    const foundBanner = await BannerModel.findById(bannerId);
  
    if (!foundBanner) {
      res.status(404);
      throw new Error("Banner Not Found");
    }
  
    const updatedBanner = await BannerModel.findByIdAndUpdate(
      bannerId,
      { $set: { isActive: !foundBanner.isActive } }, // Toggles the current value
      { new: true }
    );
  
    if (updatedBanner) {
      res.json({
        message: `Banner "${updatedBanner.title}" isActive status updated successfully`,
        banner: updatedBanner,
      });
    } else {
      res.status(500);
      throw new Error("Server error: Banner status could not be updated");
    }
  });

////-------------------------------route => PUT/v1/admin/banner/update-banner----------------------------------------------
///* @desc   Update banner
///? @access Private
const updateBanner = expressAsyncHandler(async (req, res) => {
  const { bannerId, product, title, subTitle, image } = req.body;

  if (!bannerId || !product || !title || !subTitle || !image) {
    res.status(400);
    throw new Error("Please fill in all fields");
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(bannerId)) {
    res.status(400);
    throw new Error("Invalid banner ID format");
  }
  const foundBanner = await BannerModel.findById(bannerId);
  if (!foundBanner) {
    res.status(404);
    throw new Error("Banner Not Found");
  }

  const updatedBanner = await BannerModel.findByIdAndUpdate(
    bannerId,
    { product, title, subTitle, image },
    { new: true }
  ).populate("product");

  if (updatedBanner) {
    res.json({
      message: "Banner updated successfully",
      banner: updatedBanner,
    });
  } else {
    res.status(500);
    throw new Error("Server error: Banner could not be updated");
  }
});

////-------------------------------route => DELETE/v1/admin/banner/delete-banner----------------------------------------------
///* @desc   Delete banner
///? @access Private
const deleteBanner = expressAsyncHandler(async (req, res) => {
  const { bannerId } = req.body;

  if (!bannerId) {
    res.status(400);
    throw new Error("Please provide a banner ID");
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(bannerId)) {
    res.status(400);
    throw new Error("Invalid banner ID format");
  }

  const foundBanner = await BannerModel.findById(bannerId);

  if (!foundBanner) {
    res.status(404);
    throw new Error("Banner Not Found");
  }

  await BannerModel.findByIdAndDelete(bannerId);

  res.json({
    message: "Banner deleted successfully",
  });
});

export {
  createBanner,
  getBanners,
  updateBanner,
  deleteBanner,
  updateBannerIsActive
};