import expressAsyncHandler from "express-async-handler";
import RazorPay from "razorpay";
import { v4 as uuidv4 } from 'uuid';

import crypto from "crypto";
import  Wallet  from "../../../models/wallet/wallet-model.js";
// //-------------------------------route => get/v1/wallet/create----------------------------------------------
///* @desc   create wallet
///? @access Private

export const createWallet = expressAsyncHandler(async (req, res) => {
  const existingWallet = await Wallet.findOne({
    user_id: req.user.id,
  }).populate("user_id");

  if (existingWallet) {
    res.status(409);
    console.log(existingWallet)
    throw new Error(
      `Wallet Existed for this user ${existingWallet?.user_id?.firstName}`
    );
  }

  const createWallet = await Wallet.create({
    user_id: req.user.id,
    balance: 0,
  });
  if (createWallet) {
    res
      .status(201)
      .json({ message: "Wallet Created Successfully", wallet: createWallet });
  } else {
    res.status(500);
    throw new Error(`Failed To Create Wallet `);
  }
});

// //-------------------------------route => POST/v1/wallet/add-money----------------------------------------------
///* @desc   add money to  wallet
///? @access Private

export const addMoneyToWallet = expressAsyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (Number(amount) < 1) {
    res.status(400);
    throw new Error("Amount Can Not Be Less than One Rupee");
  }
console.log()
  const wallet = await Wallet.findOne({ user_id: req.user.id });

  if (!wallet) {
    res.status(404);
    throw new Error("Wallet Not found ");
  }

  const razorPay = new RazorPay({
    key_id: process.env.RAZORPAY_KEY_ID,

    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const paymentOrder = await razorPay.orders.create({
    amount: amount * 100,
    currency: "INR",
  });

  wallet.transactions.push({
    transaction_id: uuidv4(),
    payment_id: paymentOrder.id,
    amount: amount,
    type: "credit",
    status: "initiated",
    description:"Add Money by RazorPay"
  });

  await wallet.save();

  res.status(200).json(paymentOrder);
});

// //-------------------------------route => get/v1/wallet/----------------------------------------------
///* @desc   get details  wallet
///? @access Private
export  const getWalletDetails = expressAsyncHandler(async (req, res) => {
  // Default to page 1 and limit 10 if not provided; ensure they are integers
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  // Fetch the user's wallet
  const wallet = await Wallet.findOne({ user_id: req.user.id });
  
  if (!wallet) {
    res.status(404);
    throw new Error("Wallet not found for the requested user");
  }

  // Sort transactions by updatedAt in descending order
  const sortedTransactions = wallet.transactions.sort((a, b) => b.updatedAt - a.updatedAt);

  // Filter out transactions with status "initiated" or "failed"
  const filteredTransactions = sortedTransactions.filter(
    (txn) => txn.status !== "initiated" && txn.status !== "failed"
  );

  // Pagination calculations
  const totalTransactions = filteredTransactions.length;
  const totalPages = Math.ceil(totalTransactions / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Return wallet details and paginated transactions
  return res.status(200).json({
    isWalletCreated: Boolean(wallet),
    balance: wallet.balance,
    totalTransactions,
    totalPages,
    transactions: paginatedTransactions,
  });
});


// //-------------------------------route => POST/v1/wallet/verify-payment----------------------------------------------
///* @desc   verify the  money to add  wallet
///? @access Private

export const verifyPaymentToWallet = expressAsyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, error } =
    req.body;

 

  if (error) {
    
    const wallet = await Wallet.findOne({
        user_id: req.user.id,
        "transactions.payment_id": error.metadata.order_id,
      });

      if (!wallet) {
        res.status(400);
        throw new Error("Wallet Not Found ");
      }

    const transaction = wallet.transactions.find(
      (txn) => txn.payment_id === error.metadata.order_id
    );
    if (transaction) {
      transaction.status = "failed";
      await wallet.save();
      res.status(400);
      throw new Error(`Failed to add money in the wallet`);
    } else {
      res.status(404);
      throw new Error(`transaction doesn't found`);
    }
  }

  const wallet = await Wallet.findOne({
    user_id: req.user.id,
    "transactions.payment_id": razorpay_order_id,
  });
  if (!wallet) {
    res.status(400);
    throw new Error("Wallet Not Found ");
  }
  const transaction = wallet.transactions.find(
    (txn) => txn.payment_id === razorpay_order_id
  );
  const generated_signature = await crypto
    .createHmac("sha256",process.env.RAZORPAY_KEY_SECRET).update(razorpay_order_id+"|"+razorpay_payment_id).digest("hex")

  if (generated_signature === razorpay_signature) {
    if (transaction) {
      transaction.status = "success";
      wallet.balance += Number(transaction.amount);

      await wallet.save();
      res
        .status(200)
        .json({ message: "Add Money to Wallet Successfully", wallet });
    } else {
      res.status(404);
      throw new Error(`transaction doesn't found`);
    }
  } else {
    res.status(400);
    throw new Error(`invalid razorPay transaction!`);
  }
});
