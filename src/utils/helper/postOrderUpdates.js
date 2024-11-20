import Cart from "../../models/cart/cart-model.js";
import { Coupon } from "../../models/coupons/coupons-model.js";
import Products from "../../models/products/products-model.js";

const processOrderPostPlacement = async (order, userId,res) => {
    if (!order || !userId) {
        res.status(400);
      throw new Error("Order and userId are required.");
    }
  
    const { appliedCouponAmount, couponDetails, items } = order;
  
    try {
      // Update coupon usage if applicable
      if (appliedCouponAmount && couponDetails?.code) {
        await Coupon.findOneAndUpdate(
          { code: couponDetails.code },
          {
            $push: { usageRecords: { user: userId, usedAt: new Date() } },
          }
        );
      }
  
   
      await Cart.findOneAndUpdate(
        { user: userId },
        { $set: { items: [], appliedCoupon: null } }
      );
 
      // Decrease the product stock for each item in the order
      for (const item of items) {
        const { productId, size, quantity } = item;
  
         await Products.findOneAndUpdate(
          { _id: productId, "stock.size": size },
          { $inc: { "stock.$.stock": -quantity } }
        );
  
        
      }
    } catch (error) {
        res.status(400)
      throw new Error(`Error processing post-order actions: ${error.message}`);
    }
  };
  
export default processOrderPostPlacement
  