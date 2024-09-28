import asyncHandler from 'express-async-handler';
import Offer from '../../../models/offers/offers-model.js';
import Product from '../../../models/products/products-model.js'


////-------------------------------route => POST /api/offers/create----------------------------------------------
///* @desc   Create a new offer
///? @access Private
const createOffer = asyncHandler(async (req, res) => {
  const { offerTitle, offerDescription, discountPercentage, offerType, product, category, startDate, endDate } = req.body;

  // Validation
  if (!offerTitle || !offerDescription || !discountPercentage || !offerType || !startDate || !endDate) {
    res.status(400);
    throw new Error('Please fill all the fields');
  }

  // Create offer
  const newOffer = await Offer.create({
    offerTitle,
    offerDescription,
    discountPercentage,
    offerType,
    product,
    category,
    startDate,
    endDate,
  });

  res.status(201).json({
    message: 'Offer created successfully',
    offer: newOffer,
  });
});

////-------------------------------route => DELETE /api/offers/delete/:id----------------------------------------------
///* @desc   Delete an offer
///? @access Private
const deleteOffer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const offer = await Offer.findById(id);
  if (!offer) {
    res.status(404);
    throw new Error('Offer not found');
  }

  await offer.remove();
  res.json({ message: 'Offer deleted successfully' });
});

////-------------------------------route => POST /api/offers/apply----------------------------------------------
///* @desc   Apply offer to a product or category
///? @access Public
const applyOfferToProduct = asyncHandler(async (req, res) => {
  const { productId, categoryId, discountPercentage } = req.body;

  let updatedItems;
  if (productId) {
    // Apply discount to the product
    updatedItems = await Product.findByIdAndUpdate(
      productId,
      { $set: { discount: discountPercentage } },
      { new: true }
    );
  } else if (categoryId) {
    // Apply discount to all products in the category
    updatedItems = await Product.updateMany(
      { category: categoryId },
      { $set: { discount: discountPercentage } }
    );
  }

  if (updatedItems) {
    res.json({ message: 'Offer applied successfully', updatedItems });
  } else {
    res.status(404);
    throw new Error('Product or category not found');
  }
});


////-------------------------------route => GET /api/offers/getall----------------------------------------------
///* @desc   Get all offers
///? @access Public
const getAllOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find().populate('product category');
  
  if (!offers) {
    res.status(404);
    throw new Error('No offers found');
  }

  res.json({
    message: 'Offers retrieved successfully',
    offers,
  });
});

export { createOffer, deleteOffer, applyOfferToProduct, getAllOffers };
