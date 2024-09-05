import { Router } from "express";
import AddressRouter from "./address/address-routes.js";
import { updateUserDetails } from "../../../controllers/auth/user/auth-user-Controllers.js";


const ProfileRouter = Router();


ProfileRouter.use("/addresses",AddressRouter);

ProfileRouter.patch('/overview',updateUserDetails);


export default ProfileRouter