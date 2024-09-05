import { Router } from "express";
import {login, signUp,googleSignIn,resendOtp,verifyOtp,resendToken,logout, resetPassword} from "../../controllers/auth/user/auth-user-Controllers.js"
import { adminLogin,adminResendToken,adminLogout } from "../../controllers/auth/admin/admin-auth-controller.js";

const AuthRouter = Router();



//// ------------------------------- USER auth Routes----------------------------------------------


AuthRouter.post("/user/login",login);
AuthRouter.post("/user/sign-up",signUp);
AuthRouter.post("/user/google-signIn",googleSignIn)
AuthRouter.post("/user/resend-otp",resendOtp);
AuthRouter.post("/user/verify-otp",verifyOtp);
AuthRouter.get("/user/resend-token",resendToken);
AuthRouter.post("/user/reset-password",resetPassword)
AuthRouter.delete("/user/logout",logout);



//// ------------------------------- Admin auth Routes----------------------------------------------

AuthRouter.post("/admin/login",adminLogin);
AuthRouter.get("/admin/resend-token",adminResendToken);
AuthRouter.delete("/admin/logout",adminLogout);





export default AuthRouter;