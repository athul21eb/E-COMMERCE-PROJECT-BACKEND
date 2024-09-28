import express from 'express';
import {
  createOffer,
  deleteOffer,
  applyOfferToProduct,
  getAllOffers,
} from '../../../controllers/admin/offers/offers-controllers.js';

const offerRouter = express.Router();

// Create a new offer
offerRouter.post('/create', createOffer);

// Delete an offer
offerRouter.delete('/delete/:id', deleteOffer);

// Apply offer to a product
offerRouter.post('/apply', applyOfferToProduct);

// Get all offers
offerRouter.get('/getall', getAllOffers);

export default offerRouter;
