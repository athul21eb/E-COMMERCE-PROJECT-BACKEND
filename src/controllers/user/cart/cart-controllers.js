import expressAsyncHandler from "express-async-handler";
import Cart from "../../../models/cart/cart-model.js";
import Product from "../../../models/products/products-model.js";
import {
  calculateCartTotals,
  getActiveCoupons,
} from "../../../utils/helper/helper.js";
import Wishlist from "../../../models/wishList/wishlist-model.js";

// -------------------------------route => POST/v1/cart/add-to-cart----------------------------------------------
///* @desc   Add product to cart
///? @access Private

const addToCart = expressAsyncHandler(async (req, res) => {
  const { productId, quantity, size } = req.body;
  const userId = req.user.id;
  console.log(userId);

  // Validation
  if (!productId || !quantity || !size || !userId) {
    res.status(400);
    throw new Error("Please provide product ID, quantity, and size");
  }

  // Find product
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Check stock availability for the given size
  const sizeStock = product.stock.find((item) => item.size === size);
  if (!sizeStock) {
    res.status(400);
    throw new Error(`Size ${size} not available`);
  }

  if (sizeStock.stock < quantity) {
    res.status(400);
    throw new Error(
      `Insufficient stock for size ${size}. Available stock: ${sizeStock.stock}`
    );
  }

  const cart = await Cart.findOne({ user: userId })
    .populate({
      path: "appliedCoupon",
      select:
        "code discount expirationDate maxDiscountAmount minPurchaseAmount",
    })
    .populate({
      path: "items.productId",
      populate: [
        { path: "offer" }, // Assuming you have an offer field you want to populate
      ],
    });

  // Find or create cart

  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [{ productId, quantity, size }],
    });
  } else {
    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId && item.size === size
    );
    if (existingItem) {
      existingItem.quantity += Number(quantity);
    } else {
      cart.items.push({ productId, quantity, size });
    }
  }

  const cartDetails = calculateCartTotals(cart);

  console.log(cartDetails, cart, "bbbbbbbbbbbbbbbbbbbbbbbb");
  // Check if the applied coupon is valid based on the cart total and the expiration date
  if (cart.appliedCoupon) {
    const { minPurchaseAmount, expirationDate } = cart.appliedCoupon;

    // Check if the cart total is below the minimum purchase amount or coupon is expired
    if (
      cartDetails.cartTotal < minPurchaseAmount ||
      new Date(expirationDate) < new Date()
    ) {
      cart.appliedCoupon = null; // Remove the coupon
    }
  }

  await cart.save();

  let InWishlist = await Wishlist.findOne({ userId, products: productId });

  if (InWishlist) {
    await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { products: productId } }
    );
  }

  await cart.populate({
    path: "items.productId",
    populate: { path: "brand" },
  });
  res.status(200).json({ message: "Product added to Bag", cart });
});

// -------------------------------route => GET/v1/cart/get-cart----------------------------------------------
/// @desc   Get user's cart
// @access Private

// const getToCart = expressAsyncHandler(async (req, res) => {
//   const userId = req.user.id;

//   const cart = await Cart.findOne({ user: userId })
//     .populate({
//       path: "appliedCoupon",
//       select:
//         "code discount expirationDate maxDiscountAmount minPurchaseAmount",
//     })
//     .populate({
//       path: "items.productId",
//       populate: [
//         { path: "offer" },
//         { path: "brand" }, // Populate the 'brand' field within 'productId'
//         { path: "category" }, // Assuming you have an offer field you want to populate
//       ],
//     });

//    Populate the 'category' field within 'productId'
//   if (!cart) {
//     res.status(404);
//     throw new Error("Cart not found");
//   }

//   const cartDetails = calculateCartTotals(cart?.items);

//   console.log(cartDetails, cart, "bbbbbbbbbbbbbbbbbbbbbbbb");
// Check if the applied coupon is valid based on the cart total and the expiration date
//   if (cart.appliedCoupon) {
//     const { minPurchaseAmount, expirationDate } = cart.appliedCoupon;

// Check if the cart total is below the minimum purchase amount or coupon is expired
//     if (
//       cartDetails.cartTotal < minPurchaseAmount ||
//       new Date(expirationDate) < new Date()
//     ) {
//       cart.appliedCoupon = null; // Remove the coupon
//     }
//   }

//   res.status(200).json({ message: "Cart retrieved successfully", cart });
// });

// -------------------------------route => GET/v1/cart/get-cart----------------------------------------------
///* @desc   Get user's cart and adjust item quantity if stock is limited
///? @access Private

const getCartWithStockAdjustment = expressAsyncHandler(async (req, res) => {
  const userId = req.user.id;

  const cart = await Cart.findOne({ user: userId })
    .populate({
      path: "appliedCoupon",
      select:
        "code discount expirationDate maxDiscountAmount minPurchaseAmount",
    })
    .populate({
      path: "items.productId",
      populate: [
        { path: "offer" },
        { path: "brand" }, // Populate the 'brand' field within 'productId'
        { path: "category" }, // Assuming you have an offer field you want to populate
      ],
    });

  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  // Check stock and adjust item quantity if needed
  let stockAdjusted = false;

  cart.items = await Promise.all(
    cart.items.map(async (item) => {
      const product = await Product.aggregate([
        {
          $match: {
            deletedAt: { $exists: false }, // Not soft-deleted
            isActive: true, // Only active products

            _id: item.productId._id, // Exclude the current product
          },
        },
        {
          $lookup: {
            from: "brands",
            localField: "brand",
            foreignField: "_id",
            as: "brand",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $lookup: {
            from: "offers",
            localField: "offer",
            foreignField: "_id",
            as: "offer",
          },
        },
        { $unwind: "$brand" },
        { $unwind: "$category" },
        { $unwind: { path: "$offer", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            "brand.isActive": true, // Ensure the brand is active
            "category.isActive": true, // Ensure the category is active
          },
        },
        // Limit to 5 related products
      ]);

      if (!product[0]) {
        return null; // Product not found, return null so it can be filtered out
      }

      const sizeStock = product[0]?.stock?.find(
        (stock) => stock.size === item.size
      );

      if (!sizeStock) {
        return null; // Size not found, return null so it can be filtered out
      }

      // If stock for this size is 1 or less than requested quantity, set item quantity to 1
      if (sizeStock.stock === 1 || sizeStock.stock < item.quantity) {
        item.quantity = 1; // Adjust the item quantity to 1
        stockAdjusted = true;
      }

      return item;
    })
  );

  // Filter out null values (products not found or invalid size)
  cart.items = cart.items.filter((item) => item !== null);

  const cartDetails = calculateCartTotals(cart);

  // Check if the applied coupon is valid based on the cart total and the expiration date
  if (cart.appliedCoupon) {
    const { minPurchaseAmount, expirationDate } = cart.appliedCoupon;

    // Check if the cart total is below the minimum purchase amount or coupon is expired
    if (
      cartDetails.cartTotal < minPurchaseAmount ||
      new Date(expirationDate) < new Date()
    ) {
      cart.appliedCoupon = null; // Remove the coupon
    }
  }

  await cart.save();

  // Respond with the updated cart
  res.status(200).json({
    message: "Cart retrieved successfully",
    cart,
    stockAdjusted: stockAdjusted
      ? "Some item quantities were adjusted to 1 due to limited stock"
      : "No changes to cart quantities",
  });
});

// -------------------------------route => DELETE/v1/cart/remove-item/:productId----------------------------------------------
///* @desc   Remove product from cart
///? @access Private

const removeToCart = expressAsyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { itemId } = req.params;

  // Remove product from cart
  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { $pull: { items: { _id: itemId } } },
    { new: true } // Return the updated cart after removing the item
  )
    .populate({
      path: "appliedCoupon",
      select:
        "code discount expirationDate maxDiscountAmount minPurchaseAmount",
    })
    .populate({
      path: "items.productId",
      populate: [
        { path: "offer" },
        { path: "brand" }, // Populate the 'brand' field within 'productId'
        { path: "category" }, // Assuming you have an offer field you want to populate
      ],
    });

  console.log(cart);
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  const cartDetails = calculateCartTotals(cart);

  // Check if the applied coupon is valid based on the cart total and the expiration date
  if (cart.appliedCoupon) {
    const { minPurchaseAmount, expirationDate } = cart.appliedCoupon;

    // Check if the cart total is below the minimum purchase amount or coupon is expired
    if (
      cartDetails.cartTotal < minPurchaseAmount ||
      new Date(expirationDate) < new Date()
    ) {
      cart.appliedCoupon = null; // Remove the coupon
    }
  }

  res.status(200).json({ message: "Product removed from Bag", cart });
});

// -------------------------------route => PUT/v1/cart/update-item/:productId----------------------------------------------
///* @desc   Update product quantity/size in cart
///? @access Private

const updateToCart = expressAsyncHandler(async (req, res) => {
  const { itemId } = req.params; // Using itemId instead of productId
  const { quantity, size } = req.body;
  console.log(itemId, quantity, size, "id");

  // Ensure that at least one of quantity or size is provided
  if (quantity === undefined && !size) {
    res.status(400);
    throw new Error("Either quantity or size must be provided");
  }

  const userId = req.user.id;

  // Find the cart for the current user
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  // Find the item by itemId (not productId)
  const itemIndex = cart.items.findIndex(
    (item) => item._id.toString() === itemId
  );
  console.log(itemIndex, "index");
  if (itemIndex > -1) {
    // Update item quantity and size if found
    if (quantity !== undefined) {
      cart.items[itemIndex].quantity = Math.max(1, Number(quantity));
    }
    if (size) {
      const productId = cart.items[itemIndex].productId.toString(); // Get the productId to check for existing sizes

      cart.items[itemIndex].size = size;

      // Check if there's already an item with the new size, and merge or adjust accordingly
      const existingSizeIndex = cart.items.findIndex(
        (item) =>
          item.productId.toHexString() === productId &&
          item.size === size &&
          item._id.toHexString() !== itemId
      );

      if (existingSizeIndex > -1) {
        // If an item with the new size already exists, sum quantities and remove duplicate
        cart.items[existingSizeIndex].quantity +=
          cart.items[itemIndex].quantity;
        cart.items.splice(itemIndex, 1); // Remove the old item with the previous size
      }
    }
  } else {
    // If the item wasn't found, return an error
    res.status(404);
    throw new Error("Item not found in the cart");
  }

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

  const cartDetails = calculateCartTotals(cart);

  // Check if the applied coupon is valid based on the cart total and the expiration date
  if (cart.appliedCoupon) {
    const { minPurchaseAmount, expirationDate } = cart.appliedCoupon;

    // Check if the cart total is below the minimum purchase amount or coupon is expired
    if (
      cartDetails.cartTotal < minPurchaseAmount ||
      new Date(expirationDate) < new Date()
    ) {
      cart.appliedCoupon = null; // Remove the coupon

      // Save the updated cart
      await cart.save();

      // Populate the updated cart to include product and brand details
      // Populate appliedCoupon first
      await cart.populate({
        path: "appliedCoupon",
        select:
          "code discount expirationDate maxDiscountAmount minPurchaseAmount",
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
    }
  }

  // Respond with the updated cart
  res.status(200).json({ message: "Product updated successfully", cart });
});

// -------------------------------route => DELETE/v1/cart/clear-cart----------------------------------------------
///* @desc   Clear user's cart
///? @access Private

const clearCart = expressAsyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Clear cart
  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { $set: { items: [] } },
    { new: true }
  );

  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  res.status(200).json({ message: "Cart cleared successfully", cart });
});

export {
  addToCart,
  removeToCart,
  updateToCart,
  clearCart,
  getCartWithStockAdjustment,
};
