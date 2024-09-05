import { Router } from "express";
import { createCategory,getCategories,updateCategory ,getAllCategories,updateCategoryIsActive,deleteCategory} from "../../../controllers/admin/category/category-controllers.js";

const categoryRouter = Router();

categoryRouter.post("/create-category", createCategory);
categoryRouter.get('/get-categories',getCategories);
categoryRouter.get('/get-all-categories',getAllCategories);
categoryRouter.put('/update-category',updateCategory);
categoryRouter.patch('/update-category-isActive',updateCategoryIsActive);
categoryRouter.delete('/delete-category',deleteCategory);

export default categoryRouter;
