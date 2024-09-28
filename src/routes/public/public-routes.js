import { Router } from "express";
import { getAllProductsWithFilters, getAllBrands, getProductById, getNewArrivals, getProductsByCategory } from "../../controllers/public/public-controllers.js";

const PublicRouter = Router();

// Public Routes
PublicRouter.get("/get-products", getAllProductsWithFilters);
PublicRouter.get("/get-brands", getAllBrands);
PublicRouter.get("/get-product/:id", getProductById);
PublicRouter.get("/new-arrivals", getNewArrivals);
PublicRouter.get("/products/category/:categoryName", getProductsByCategory);

export default PublicRouter;
