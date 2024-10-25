import expressAsyncHandler from "express-async-handler";
import Cart from "../../../models/cart/cart-model.js";
import { Coupon } from "../../../models/coupons/coupons-model.js";
import {
  calculateCartTotals,
  getActiveCoupons,
} from "../../../utils/helper/helper.js";

// -------------------------------route => GET/v1/coupons/get-coupons----------------------------------------------
//* @desc   Get applicable coupons for user's cart
//? @access Private

const getCoupons = expressAsyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Find cart with populated product and offer data
  const cart = await Cart.findOne({ user: userId }).populate({
    path: "items.productId",
    populate: { path: "offer" },
  });

  if (!cart || !cart?.items.length) {
    res.status(404);
    throw new Error("Cart not found");
  }

  const activeCoupons = await getActiveCoupons(userId);

  res.status(200).json({ coupons: activeCoupons });
});

// -------------------------------route => POST/v1/coupons/apply-coupon----------------------------------------------
//* @desc   Apply coupon to user's cart
//? @access Private

const applyCoupon = expressAsyncHandler(async (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  

  if (!code) {
    res.status(400);
    throw new Error("Coupon code is required");
  }

  const currentDate = new Date();
  const coupon = await Coupon.findOne({
    code,
    status: "active", // Ensure coupon is active
    expirationDate: { $gt: currentDate },
    usageRecords: {
      $not: { $elemMatch: { user: userId } }, // Check if the user has not used the coupon
    },
  });

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not valid or already used");
  }

  const cart = await Cart.findOne({ user: userId })
    .populate({
      path: "appliedCoupon",
      select:
        "code discount expirationDate maxDiscountAmount minPurchaseAmount _id",
    })
    .populate({
      path: "items.productId",
      populate: [
        { path: "offer" }, // Assuming you have an offer field you want to populate
      ],
    });

  if (!cart || !cart?.items.length) {
    res.status(404);
    throw new Error("Cart not found");
  }
  
  // Check if a coupon is already applied to the cart
  if (
    cart.appliedCoupon &&
    cart.appliedCoupon._id.toString() === coupon._id.toString()
  ) {
    res.status(400);
    throw new Error("Coupon already applied");
  }

  const cartDetails = calculateCartTotals(cart);
console.log(cartDetails.cartTotal , coupon.minPurchaseAmount)
  // Check minimum purchase requirement
  if (cartDetails.cartTotal < coupon.minPurchaseAmount) {
    res.status(400);
    throw new Error(
      `Coupon requires a minimum purchase amount  of ${coupon.minPurchaseAmount} `
    );
  }

  // Apply coupon
  cart.appliedCoupon = coupon._id;

  // Save the updated cart
  await cart.save();

  // Populate the updated cart to include product and brand details
  // Populate appliedCoupon first
  await cart.populate({
    path: "appliedCoupon",
    select: "code discount expirationDate maxDiscountAmount minPurchaseAmount",
  });

  // Then populate items.productId with offer, brand, and category
  await cart.populate({
    path: "items.productId",
    populate: [
      { path: "offer" },
      { path: "brand" }, // Populate 'brand' field
      { path: "category" }, // Populate 'category' field
    ],
  });

  res.status(200).json({ message: "Coupon applied successfully", cart });
});

// -------------------------------route => DELETE/v1/coupons/remove-coupon----------------------------------------------
//* @desc   Remove applied coupon from cart
//? @access Private

const removeCoupon = expressAsyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Find the cart and remove applied coupon
  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { $unset: { appliedCoupon: "" } },
    { new: true }
  );

  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  // Populate the updated cart to include product and brand details

  // Then populate items.productId with offer, brand, and category
  await cart.populate({
    path: "items.productId",
    populate: [
      { path: "offer" },
      { path: "brand" }, // Populate 'brand' field
      { path: "category" }, // Populate 'category' field
    ],
  });

  res.status(200).json({ message: "Coupon removed successfully", cart });
});

export { getCoupons, applyCoupon, removeCoupon };
