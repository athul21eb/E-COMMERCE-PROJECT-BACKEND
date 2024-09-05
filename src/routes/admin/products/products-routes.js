import { Router } from "express";
import {
  createProduct,
  getProducts,
  updateProduct,
  updateProductIsActive,
  deleteProduct,
  getProductById
} from "../../../controllers/admin/product/product-controllers.js";

const productRouter = Router();

productRouter.post("/create-product", createProduct);
productRouter.get("/get-products", getProducts);
productRouter.put("/update-product", updateProduct);
productRouter.patch("/update-product-isActive", updateProductIsActive);
productRouter.delete("/delete-product", deleteProduct);
productRouter.get("/get-product/:id",getProductById)

export default productRouter;
