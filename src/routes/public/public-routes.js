import { Router } from "express";
import { getAllBrands, getAllProducts, getProductById } from "../../controllers/public/public-controllers.js";


const PublicRouter = Router();



//// ------------------------------- public Routes----------------------------------------------


PublicRouter.get("/get-products",getAllProducts);

PublicRouter.get("/get-Brands",getAllBrands);
PublicRouter.get("/get-product/:id",getProductById)







export default PublicRouter;