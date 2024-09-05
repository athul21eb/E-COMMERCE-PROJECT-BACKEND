import { Router } from "express";
import {
  getCustomers,
  updateCustomer,
  updateCustomerIsBlocked,
  deleteCustomer,
} from "../../../controllers/admin/customers/customers-controllers.js";

const customerRouter = Router();

customerRouter.get("/get-customers", getCustomers);
customerRouter.put("/update-customer", updateCustomer);
customerRouter.patch("/update-customer-isBlocked", updateCustomerIsBlocked);
customerRouter.delete("/delete-customer", deleteCustomer);

export default customerRouter;
