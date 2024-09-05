import { Router } from "express";
import {
  getAddress,
  getAllAddresses,
  addAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} from "../../../../controllers/user/profile/address/address-controllers.js";

const AddressRouter = Router();

//// ------------------------------- Address Routes----------------------------------------------

// Route to get a specific address
AddressRouter.get("/:addressId", getAddress);

// Route to get all addresses of the user
AddressRouter.get("/", getAllAddresses);

// Route to add a new address
AddressRouter.post("/add", addAddress);

// Route to update an existing address
AddressRouter.put("/update/:addressId", updateAddress);

// Route to set a specific address as default
AddressRouter.patch("/set-default/:addressId", setDefaultAddress);

// Route to delete a specific address
AddressRouter.delete("/delete/:addressId", deleteAddress);

export default AddressRouter;
