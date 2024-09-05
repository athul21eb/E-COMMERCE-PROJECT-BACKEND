import expressAsyncHandler from "express-async-handler";
import CustomerModel from "../../../models/user/user-model.js";

////-------------------------------route => GET/get-customers----------------------------------------------
///* @desc   Get all customers
///? @access Private

const getCustomers = expressAsyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1; // Current page number, default to 1
  const limit = Number(req.query.limit) || 10; // Customers per page, default to 10
  const skip = (page - 1) * limit; // Calculate how many customers to skip

  // Get the total number of customers excluding soft-deleted ones
  const totalCustomersCount = await CustomerModel.countDocuments({
    deletedAt: { $exists: false },
  });

  // Fetch the customers with pagination, excluding soft-deleted ones
  const customers = await CustomerModel.find({
    deletedAt: { $exists: false },
  })
    .skip(skip) // Skip the necessary customers
    .limit(limit); // Limit the number of customers retrieved

  if (!customers.length) {
    res.status(404);
    throw new Error("No customers found");
  }

  res.json({
    message: "Customers retrieved successfully",
    customers,
    totalCustomersCount, // Include the total count for pagination
  });
});


////-------------------------------route => PUT/update-customer----------------------------------------------
///* @desc   Update customer
///? @access Private

const updateCustomer = expressAsyncHandler(async (req, res) => {
  const {
    customerId,
    firstName,
    lastName,
    mobile_no,
    isVerified,
    isAuthorized,
    isBlocked,
  } = req.body;

  if (!customerId || !firstName || !lastName || !mobile_no) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }

  // Check if the mobile number is unique
  const existingCustomer = await CustomerModel.findOne({
    mobile_no,
    _id: { $ne: customerId },
  });
  if (existingCustomer) {
    res.status(400);
    throw new Error("Mobile number already in use");
  }

  const customerData = await CustomerModel.findByIdAndUpdate(
    customerId,
    {
      firstName,
      lastName,
      mobile_no,

      isVerified,
      isAuthorized,
      isBlocked,
    },
    { new: true }
  );

  if (customerData) {
    res.json({
      message: "Customer updated successfully",
      customer: customerData,
    });
  } else {
    res.status(500);
    throw new Error("Server error: Customer could not be updated");
  }
});

////-------------------------------route => PATCH/update-customer-isActive----------------------------------------------
///* @desc  Update customer's isBlocked status
///? @access Private

const updateCustomerIsBlocked = expressAsyncHandler(async (req, res) => {
  const { customerId } = req.body;
  console.log(customerId, "customer id");

  if (!customerId) {
    res.status(400);
    throw new Error("Please provide a customer ID");
  }

  const foundCustomer = await CustomerModel.findById(customerId);

  if (!foundCustomer) {
    res.status(404);
    throw new Error("Customer Not Found");
  }
  console.log(foundCustomer.isBlocked, "customer found id");
  const customerData = await CustomerModel.findByIdAndUpdate(
    customerId,
    { $set: { isBlocked: !foundCustomer.isBlocked } }, // Toggles the current value
    { new: true }
  );
  console.log(customerData.isBlocked, "update id");
  console.log(customerData);
  if (customerData) {
    res.json({
      message: `${customerData.firstName} ${
        customerData.isBlocked ? "blocked" : "unblocked"
      } successfully`,
      customer: customerData,
    });
  } else {
    res.status(500);
    throw new Error("Server error: Customer status could not be updated");
  }
});

////-------------------------------route => DELETE/delete-customer----------------------------------------------
///* @desc   Soft delete customer
///? @access Private

const deleteCustomer = expressAsyncHandler(async (req, res) => {
  const { customerId } = req.body;

  if (!customerId) {
    res.status(400);
    throw new Error("Please provide a customer ID");
  }

  const foundCustomer = await CustomerModel.findById(customerId);

  if (!foundCustomer) {
    res.status(404);
    throw new Error("Customer Not Found");
  }

  const customerData = await CustomerModel.findByIdAndUpdate(
    customerId,
    { $set: { deletedAt: new Date(), isBlocked: true } }, // Set deletedAt and block the customer
    { new: true }
  );

  if (customerData) {
    res.json({
      message: "Customer soft deleted successfully",
      customer: customerData,
    });
  } else {
    res.status(500);
    throw new Error("Server error: Customer could not be deleted");
  }
});

export {
  getCustomers,
  updateCustomer,
  updateCustomerIsBlocked,
  deleteCustomer,
};
