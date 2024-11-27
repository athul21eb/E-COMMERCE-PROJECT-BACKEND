import { Router } from "express";
import {
  createBanner,
  getBanners,
  updateBanner,
  deleteBanner,
  updateBannerIsActive,
  getOfferProducts,
} from "../../../controllers/admin/banner/banner-controllers.js";

const bannerRouter = Router();

bannerRouter.post("/create-banner", createBanner);
bannerRouter.get("/get-banners", getBanners);
bannerRouter.put("/update-banner", updateBanner);
bannerRouter.patch("/update-banner-isActive", updateBannerIsActive); // New route for updating isActive
bannerRouter.delete("/delete-banner", deleteBanner);
bannerRouter.get("/offer-products",getOfferProducts)

export default bannerRouter;
