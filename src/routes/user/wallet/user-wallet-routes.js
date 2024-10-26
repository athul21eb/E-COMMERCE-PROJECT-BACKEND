
import {Router} from "express";
import { addMoneyToWallet, createWallet, getWalletDetails, verifyPaymentToWallet } from "../../../controllers/user/wallet/wallet-controllers.js";

const WalletRouter = Router();


WalletRouter.get("/",getWalletDetails);
WalletRouter.post('/create',createWallet);
WalletRouter.post("/add-money",addMoneyToWallet);
WalletRouter.post("/verify-payment",verifyPaymentToWallet);


export default WalletRouter;