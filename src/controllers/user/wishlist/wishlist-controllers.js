import expressAsyncHandler from "express-async-handler";
import Wishlist from "../../../models/wishList/wishlist-model.js";
import Product from "../../../models/products/products-model.js";
import Cart from "../../../models/cart/cart-model.js";

////----------- @desc   Add product to wishlist
// @route  POST /wishlist/add
// @access Private
const addToWishlist = expressAsyncHandler(async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;

  // Validation
  if (!productId) {
    res.status(400);
    throw new Error("Please provide a product ID");
  }

  // Find or create wishlist
  let wishlist = await Wishlist.findOne({ userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({
      userId,
      products: [productId],
    });
  } else {
    if (wishlist.products.includes(productId)) {
      res.status(400);
      throw new Error("Product already in wishlist");
    }
    wishlist.products.push(productId);
  }

  await wishlist.save();
  await wishlist.populate({
    path: "products",
    populate: [{ path: "offer" }, { path: "brand" }, { path: "category" }],
  });

  res.status(200).json({ message: "Product added to wishlist", wishlist });
});

////---------------- @desc   Remove product from wishlist
// @route  DELETE /wishlist/remove/:productId
// @access Private
const removeFromWishlist = expressAsyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;
  
  try {
    // Remove product from wishlist
    const wishlist = await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { products: productId } },
      { new: true }
    ).populate({
      path: "products",
      populate: [{ path: "offer" }, { path: "brand" }, { path: "category" }],
    });

    if (!wishlist) {
      res.status(404);
      throw new Error("Wishlist not found");
    }

    res
      .status(200)
      .json({ message: "Product removed from wishlist", wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

////------------------ @desc   Get all products in wishlist
// @route  GET /wishlist
// @access Private
const getWishList = expressAsyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Find wishlist by user ID
  const wishlist = await Wishlist.findOne({ userId }).populate({
    path: "products",
    populate: [{ path: "offer" }, { path: "brand" }, { path: "category" }],
  });

  if (!wishlist) {
    res.status(404);
    throw new Error("Wishlist not found");
  }

  res
    .status(200)
    .json({ message: "Wishlist retrieved successfully", wishlist });
});

////------------------------ @desc   Move product from wishlist to cart
// @route  POST /wishlist/move-to-bag
// @access Private
const moveToBag = expressAsyncHandler(async (req, res) => {
  const { productId, quantity, size } = req.body;
  const userId = req.user.id;

  // Validation
  if (!productId || !quantity || !size) {
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

  // Remove product from wishlist
  const wishlist = await Wishlist.findOneAndUpdate(
    { userId },
    { $pull: { products: productId } },
    { new: true }
  );

  if (!wishlist) {
    res.status(404);
    throw new Error("Wishlist not found");
  }

  // Find or create cart
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [{ productId, quantity, size }],
    });
  } else {
    // Check if the item already exists in the cart with the same size
    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId && item.size === size
    );

    if (existingItem) {
      // If exists, update the quantity
      existingItem.quantity += Number(quantity);
    } else {
      // If not, add the item to the cart
      cart.items.push({ productId, quantity, size });
    }
  }

  await cart.save();

  // Populate the cart with product and brand details
  await cart.populate({
    path: "items.productId",
    populate: { path: "brand" },
  });

  // Send response
  res.status(200).json({
    message: "Product moved to Bag",
    cart,
    wishlist,
  });
});

export { addToWishlist, removeFromWishlist, getWishList, moveToBag };
