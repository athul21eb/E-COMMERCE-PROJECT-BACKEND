import asyncHandler from "express-async-handler";
import Offer from "../../../models/offers/offers-model.js";
import Product from "../../../models/products/products-model.js";
import Category from "../../../models/category/category-model.js"; // Import Category model
import { json } from "express";
import CategoryModel from "../../../models/category/category-model.js";

////-------------------------------route => POST /api/offers/create----------------------------------------------
///* @desc   Create a new offer
///? @access Private
const createOffer = asyncHandler(async (req, res) => {
  const {
    offerTitle,
    offerDescription,
    discountPercentage,
    offerType,
    startDate,
    endDate,
  } = req.body;

  // Validation
  if (
    !offerTitle ||
    !offerDescription ||
    !discountPercentage ||
    !offerType ||
    !startDate ||
    !endDate
  ) {
    res.status(400);
    throw new Error("Please fill all the fields");
  }


  // Validate the startDate format
if (!startDate || isNaN(new Date(startDate))) {
  return res.status(400).json({ error: "Invalid start date format." });
}

// Check if the start date is in the past
if (new Date(startDate) < new Date()) {
  return res.status(400).json({ error: "Start date cannot be in the past." });
}

  // Create offer
  const newOffer = await Offer.create({
    offerTitle,
    offerDescription,
    discountPercentage,
    offerType,
    startDate,
    endDate,
  });

  res.status(201).json({
    message: "Offer created successfully",
    offer: newOffer,
  });
});

////------------------------- Route => DELETE /api/offers/delete/:id
/* @desc   Delete an offer
? @access Private */
const deleteOffer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Fetch the offer by ID
  const offer = await Offer.findById(id);
  if (!offer) {
    res.status(404);
    throw new Error("Offer not found");
  }

  // Remove the offer from products that had this offer applied
  const productsUpdateResult = await Product.updateMany(
    { offer: id }, // Filter products that have the offer applied
    {
      $unset: { offerPrice: "", offer: "" }, // Remove `offerPrice` and `offer` fields
    }
  );

  // Remove the offer from categories that had this offer applied
  const categoriesUpdateResult = await Category.updateMany(
    { offer: id }, // Categories that had this offer applied
    {
      $unset: { offer: "" }, // Remove the offer from the category
    }
  );

  // Use deleteOne() to remove the offer document
  await Offer.findByIdAndDelete(id);

  res.json({
    message: "Offer deleted successfully",
  });
});

////-------------------------------route => GET /api/offers/getall----------------------------------------------
///* @desc   Get all offers
///? @access Public
const getAllOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find({});

  if (!offers) {
    return res.json({
      message: "Offers not found",
      offers: [],
    });
  }

  res.json({
    message: "Offers retrieved successfully",
    offers,
  });
});

////-------------------------------route => GET /api/offers----------------------------------------------
///* @desc   Get offers by type
///? @access Public
const getOffersByType = asyncHandler(async (req, res) => {
  const { offerType } = req.query;

  const offers = await Offer.find(offerType ? { offerType } : {});
  // Populate appliedCategories with category details

  if (!offers.length) {
    return res.json({
      message: "Offers Not Found",
      offers: [],
    });
  }

  res.json({
    message: "Offers retrieved successfully",
    offers,
  });
});

////------------------------- Route => DELETE /api/offers/apply-to-product
/* @desc   apply an offer
? @access Private */

const applyOfferToProduct = asyncHandler(async (req, res) => {
  const { offerId, productId } = req.body;

  // Fetch the offer
  const offer = await Offer.findById(offerId);
  if (!offer) {
    return res.status(404).json({ message: "Offer not found" });
  }

  // Ensure the offerType is for products
  if (offer.offerType !== "product") {
    return res
      .status(400)
      .json({ message: "This offer can only be applied to products" });
  }


  // Ensure the offerType is for products
  if ( offer && new Date(offer.endDate) < new Date()) {
    return res
      .status(400)
      .json({ message: "expired offer" });
  }
  // Fetch the product
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // Check for an existing offer on the product
  const existingOffer = await Offer.findOne({ appliedProducts: productId });

  // Condition 1: If the existing offer is expired, no need for discount percentage comparison
  const isExistingOfferExpired =
    existingOffer && new Date(existingOffer.endDate) < new Date();

  // Condition 2: If not expired, compare discount percentages
  if (
    existingOffer &&
    !isExistingOfferExpired &&
    existingOffer.discountPercentage >= offer.discountPercentage
  ) {
    return res
      .status(400)
      .json({
        message: "An existing offer provides a better or equal discount",
      });
  }

  // Apply the new offer
  const newOfferPrice = Math.round(
    product.salePrice * (1 - offer.discountPercentage / 100)
  );

  // Update the product with the new offer
  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    { $set: { offerPrice: newOfferPrice, offer: offerId } },
    { new: true }
  );

  // Remove the product from any previous offer's appliedProducts array
  if (existingOffer) {
    await Offer.updateOne(
      { _id: existingOffer._id },
      { $pull: { appliedProducts: productId } }
    );
  }

  // Add the product to the new offer's appliedProducts array
  if (!offer.appliedProducts.includes(productId)) {
    offer.appliedProducts.push(productId);
    await offer.save();
  }

  res.json({
    message: "Offer applied to product successfully",
    updatedProduct,
  });
});

////--------------------------- Route => POST /api/offers/apply-to-category
// @desc    Apply an offer to a category
// @access  Private
const applyOfferToCategory = asyncHandler(async (req, res) => {
  const { offerId, categoryId } = req.body;

  // Fetch the offer
  const offer = await Offer.findById(offerId);
  if (!offer) {
    return res.status(404).json({ message: "Offer not found" });
  }

  // Ensure the offerType is for categories
  if (offer.offerType !== "category") {
    return res
      .status(400)
      .json({ message: "This offer can only be applied to categories" });
  }

  // Fetch any existing offer applied to the category
  const existingCategoryOffer = await Offer.findOne({
    appliedCategories: categoryId,
  });

  // Condition 1: If the existing offer is expired, no need for discount percentage comparison
  const isExistingOfferExpired =
    existingCategoryOffer &&
    new Date(existingCategoryOffer.endDate) < new Date();

  // Condition 2: If not expired, compare discount percentages
  if (
    existingCategoryOffer &&
    !isExistingOfferExpired &&
    existingCategoryOffer.discountPercentage >= offer.discountPercentage
  ) {
    return res
      .status(409)
      .json({
        message: "An existing offer provides a better or equal discount",
      });
  }

  // Fetch all products in the category
  const productsInCategory = await Product.find({ category: categoryId });

  // Loop through all products in the category
  for (const product of productsInCategory) {
    const existingProductOffer = await Offer.findOne({
      appliedProducts: product._id,
    });

    // Check if the existing offer on the product is expired
    const isProductOfferExpired =
      existingProductOffer &&
      new Date(existingProductOffer.endDate) < new Date();

    // If not expired and the current offer provides a better discount, skip applying the new offer
    if (
      existingProductOffer &&
      !isProductOfferExpired &&
      existingProductOffer.discountPercentage >= offer.discountPercentage
    ) {
      continue; // Skip this product
    }

    // Calculate the new offer price
    const newOfferPrice = Math.round(
      product.salePrice * (1 - offer.discountPercentage / 100)
    );

    // Update the product with the new offer
    await Product.findByIdAndUpdate(
      product._id,
      { $set: { offerPrice: newOfferPrice, offer: offerId } },
      { new: true }
    );

    // Remove the product from the old offer's appliedProducts array, if necessary
    if (existingProductOffer) {
      await Offer.updateOne(
        { _id: existingProductOffer._id },
        { $pull: { appliedProducts: product._id } }
      );
    }

    // Add the product to the new offer's appliedProducts array
    if (!offer.appliedProducts.includes(product._id)) {
      offer.appliedProducts.push(product._id);
    }
  }



  // Update the product with the new offer
  await CategoryModel.findByIdAndUpdate(
    categoryId,
    { $set: {  offer: offerId } },
    { new: true }
  );


  // Remove the category from any previous offer's appliedCategories array
  if (existingCategoryOffer) {
    await Offer.updateOne(
      { _id: existingCategoryOffer._id },
      { $pull: { appliedCategories: categoryId } }
    );
  }


  

  // Add the category to the new offer's appliedCategories array
  if (!offer.appliedCategories.includes(categoryId)) {
    offer.appliedCategories.push(categoryId);
    await offer.save();
  }

  res.json({
    message: "Offer applied to category successfully",
  });
});

////----------------------------------------imports----------------------

export {
  createOffer,
  deleteOffer,
  applyOfferToProduct,
  applyOfferToCategory,
  getAllOffers,
  getOffersByType,
};
