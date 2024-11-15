
import { Coupon } from "../../models/coupons/coupons-model.js"; // Import your coupon model

// Utility function to check active coupons for the user
export const getActiveCoupons = async (userId) => {
  const currentDate = new Date();
  
  return await Coupon.find({
    expirationDate: { $gt: currentDate },
    status: 'active',
    usageRecords: {
      $not: { $elemMatch: { user: userId } }
    }
  }, {
    code: true,
    discount: true,
    maxDiscountAmount: true,
    minPurchaseAmount: true
  });
};













// Helper function to calculate cart totals
export const calculateCartTotals = (cartDetails) => {
  const currentDate = new Date();
  const items = cartDetails?.items ?? [];

  // Initialize summary object
  const CartSummary = {
    cartTotal: 0,
    totalDiscount: 0,
    totalMRP: 0,
    totalQuantity: 0,
    couponDiscount: 0,
    discountMap: {}
  };

  // Process each item in the cart
  for (const item of items) {
    const { productId, quantity = 1, _id } = item;
    if (!productId || !_id) continue; // Skip if productId or item _id is missing

    const { offer, salePrice = 0, offerPrice = salePrice } = productId;
    const hasOffer = offer?.startDate && offer?.endDate;
    const isOfferActive =
      hasOffer &&
      new Date(offer.startDate) <= currentDate &&
      new Date(offer.endDate) >= currentDate;

    const applicablePrice = isOfferActive ? offerPrice : salePrice;

    // Update cart totals
    CartSummary.cartTotal += applicablePrice * quantity;
    CartSummary.totalMRP += salePrice * quantity;
    CartSummary.totalQuantity += quantity;

    // Calculate discount if offer is active
    if (isOfferActive) {
      const discountPerItem = salePrice - offerPrice;
      const discountAmount = discountPerItem * quantity;
      CartSummary.totalDiscount += discountAmount;

      // Store the discount amount for this item in the discount map
      CartSummary.discountMap[_id] = discountAmount;
    }
  }

  // Calculate coupon discount if applicable
  const { appliedCoupon } = cartDetails || {};
  if (
    appliedCoupon?.expirationDate &&
    new Date(appliedCoupon.expirationDate) > currentDate
  ) {
    const calculatedDiscount = Math.ceil(
      CartSummary.cartTotal * (appliedCoupon.discount / 100)
    );
    CartSummary.couponDiscount = Math.min(
      calculatedDiscount,
      appliedCoupon.maxDiscountAmount
    );
  }

  // Calculate final total amount after applying the coupon discount
  CartSummary.totalAmount = Math.ceil(
    CartSummary.cartTotal - CartSummary.couponDiscount
  );

  return CartSummary;
};

  