import Wallet from "../../models/wallet/wallet-model.js";
import {v4} from "uuid"

export const processRefund = async (order, item, userId) => {
    if (order.payment.method === "PayOnDelivery") return;
  
    let wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) {
      wallet = await Wallet.create({
        user_id: userId,
        balance: 0,
      });
    }
  
    let refundAmount;
    if (order.appliedCouponAmount !== 0) {
      const originalBillAmount = order.billAmount + order.appliedCouponAmount;
      const itemProportion = item.itemTotalPrice / originalBillAmount;
      refundAmount = Math.floor(itemProportion * order.billAmount);
    } else {
      refundAmount = item.itemTotalPrice;
    }
  
    wallet.transactions.push({
      amount: refundAmount,
      transaction_id: v4(),
      status: "success",
      type: "credit",
      description: `Refund for cancellation of item in order: ${order.orderId}`,
    });
    wallet.balance += refundAmount;
    await wallet.save();
  
    console.log(`Refunded ${refundAmount} to the user's wallet`);
  };
  

  