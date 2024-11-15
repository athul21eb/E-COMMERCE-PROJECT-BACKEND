import express from 'express';
import {
  createOffer,
  deleteOffer,
  applyOfferToProduct,
  applyOfferToCategory,
  getAllOffers,
  getOffersByType, // Importing the new controller method
} from '../../../controllers/admin/offers/offers-controllers.js';

const offerRouter = express.Router();

// Create a new offer
offerRouter.post('/create', createOffer);

// Delete an offer
offerRouter.delete('/delete/:id', deleteOffer);

// Apply offer to a product
offerRouter.post('/apply-to-product', applyOfferToProduct);

// Apply offer to a category
offerRouter.post('/apply-to-category', applyOfferToCategory);

// Get all offers
offerRouter.get('/getall', getAllOffers);

// Get offers by type
offerRouter.get('/', getOffersByType); // Updated route for getting offers by type

export default offerRouter;
