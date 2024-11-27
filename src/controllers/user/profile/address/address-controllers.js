import expressAsyncHandler from "express-async-handler";
import UserModel from "../../../../models/user/user-model.js"; // Adjust the path as needed

//// -------------------------------route => GET/v1/user/profile/address/:addressId----------------------------------------------
///* @desc   Get a specific address
///? @access Private

const getAddress = expressAsyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const userId = req.user.id;

  // Find the user and the specific address
  const user = await UserModel.findById(userId).select("address");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const address = user.address.id(addressId);
  if (!address) {
    res.status(404);
    throw new Error("Address not found");
  }

  res.status(200).json({ message: "Address retrieved successfully", address });
});

//// -------------------------------route => GET/v1/user/profile/address----------------------------------------------
///* @desc   Get all addresses of the user
///? @access Private

const getAllAddresses = expressAsyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Find the user and return all addresses
  const user = await UserModel.findById(userId).select("address");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    message: "Addresses retrieved successfully",
    addresses: user.address,
  });
});

//// -------------------------------route => POST/v1/user/address/add----------------------------------------------
///* @desc   Add a new address
///? @access Private

const addAddress = expressAsyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {data:newAddress} = req.body;
  
 

  // Validate address data
  if (
    !newAddress.firstName ||
    !newAddress.lastName ||
    !newAddress.state ||
    !newAddress.district ||
    !newAddress.city ||
    !newAddress.pincode ||
    !newAddress.mobileNumber
  ) {
    res.status(400);
    throw new Error("Missing required address fields");
  }

  // Find the user and add the address
  const user = await UserModel.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.address.length === 0) {
    newAddress.isDefaultAddress = true;
  }
  user.address.push(newAddress);
  await user.save();

  res
    .status(201)
    .json({ message: "Address added successfully", addresses: user.address });
});

//// -------------------------------route => PUT/v1/user/address/update/:addressId----------------------------------------------
///* @desc   Update an existing address
///? @access Private

const updateAddress = expressAsyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const updatedData = req.body;

  if (!Object.entries(updatedData).length) {
    res.status(400);
    throw new Error("Missing required fields");
  }

  const userId = req.user.id;

  // Find the user and the specific address
  const user = await UserModel.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const address = user.address.id(addressId);
  if (!address) {
    res.status(404);
    throw new Error("Address not found");
  }

  // Update address
  address.set(updatedData);
  await user.save();

  res
    .status(200)
    .json({ message: "Address updated successfully", addresses: user.address });
});

//// -------------------------------route => PATCH/v1/user/address/set-default/:addressId----------------------------------------------
///* @desc   Set a specific address as default
///? @access Private

const setDefaultAddress = expressAsyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const userId = req.user.id;

  // Find the user and the specific address
  const user = await UserModel.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Set all addresses to non-default
  user.address.forEach((address) => (address.isDefaultAddress = false));

  // Find and set the selected address as default
  const address = user.address.id(addressId);
  if (!address) {
    res.status(404);
    throw new Error("Address not found");
  }

  address.isDefaultAddress = true;
  await user.save();

  res.status(200).json({
    message: "Default address set successfully",
    addresses: user.address,
  });
});
//// -------------------------------route => DELETE/v1/user/address/delete/:addressId----------------------------------------------
///* @desc   Delete a specific address
///? @access Private

const deleteAddress = expressAsyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const userId = req.user.id;

  // Find the user and the specific address
  const user = await UserModel.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const address = user.address.id(addressId);
  if (!address) {
    res.status(404);
    throw new Error("Address not found");
  }

  // Check if the address is the default address
  const isDefaultAddress = address.isDefaultAddress;

  // Remove the address from the user's address array
  user.address.pull({ _id: addressId });

  // If the deleted address was the default, set another address as the default
  if (isDefaultAddress) {
    if (user.address.length > 0) {
      // Set the first remaining address as the new default
      user.address[0].isDefaultAddress = true;
    }
  }

  // Save the updated user information
  await user.save();

  res.status(200).json({
    message: "Address deleted successfully",
    addresses: user.address
  });
});


export {
  getAddress,
  getAllAddresses,
  addAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
};
