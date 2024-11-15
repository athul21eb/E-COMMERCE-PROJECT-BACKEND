
import {Coupon} from "../../../models/coupons/coupons-model.js";
import asyncHandler from 'express-async-handler';

////------------------------------------route => GET /api/coupons-----------------------------------------------
///* @desc   Get all coupons
///? @access Public
const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find();

  if (!coupons) {
    res.status(404);
    throw new Error("No coupons found");
  }

  res.json({
    message: "Coupons retrieved successfully",
    coupons,
  });
});

////------------------------------------route => POST /api/coupons----------------------------------------------
///* @desc   Add a new coupon
///? @access Public
const addCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    discount,
    expirationDate,
    minPurchaseAmount,
    maxDiscountAmount,
  } = req.body;
 

  const coupon = await Coupon.create({
    code,
    discount,
    expirationDate,
    minPurchaseAmount,
    maxDiscountAmount,
  });

  if (!coupon) {
    res.status(500);
    throw new Error("Failed to add coupon");
  }
  const coupons = await Coupon.find() || [];

  res.status(201).json({
    message: "Coupon created successfully",
    coupons,
  });
});

////---------------------------------route => DELETE /api/coupons/:couponId------------------------------------
///* @desc   Delete a coupon by ID
///? @access Public
const deleteCoupon = asyncHandler(async (req, res) => {
  const { couponId } = req.params;

  const coupon = await Coupon.findByIdAndDelete(couponId);

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon with the specified ID not found");
  }
  const coupons = await Coupon.find() || [];

  res.json({
    message: "Coupon deleted successfully",coupons
  });
});

export {
  getCoupons,
  addCoupon,
  deleteCoupon,
};

