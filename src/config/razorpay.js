import RazorPay from 'razorpay'

import {config} from 'dotenv'

config();

export const razorPay = new RazorPay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_KEY_SECRET
})