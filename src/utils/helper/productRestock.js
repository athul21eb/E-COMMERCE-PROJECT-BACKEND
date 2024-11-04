import Products from "../../models/products/products-model.js";

export  const  restoreProductStock = async (productId, size, quantity) => {
    const product = await Products.findById(productId);
    if (!product) {
        res.status(400)
      throw new Error(`Product not found: ${productId}`);
    }
  
    let sizeIndex = product.stock.findIndex((stockItem) => stockItem.size === size);
    if (sizeIndex === -1) {
      product.stock.push({ size: size, stock: quantity });
    } else {
      product.stock[sizeIndex].stock += quantity;
    }
  
    await product.save();
  };