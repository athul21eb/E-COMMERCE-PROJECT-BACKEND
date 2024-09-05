import asyncHandler from "express-async-handler";
import AdminModel from "../../../models/admin/admin-model.js";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../../utils/JWT/generate-JWT.js";


//// -------------------------------route => POST/v1/auth/admin/login----------------------------------------------
///* @desc   admin Login
///? @access Public

const adminLogin = asyncHandler(async(req,res)=>{

    const { email,password} = req.body;





 ////validation
 if (!email || !password) {
    res.status(400);
    throw new Error("  All fields are required ");
  }

  const admin = await AdminModel.findOne({email});

  

  if( admin && (await admin.matchPassword(password))){

    const {_id,
        firstName,
        lastName,
        email,
        mobile_no,
       role} = admin;

         //// generate tokens
   const accessToken = await generateAccessToken({
    _id,
    email,
   role
  });
  await generateRefreshToken(res, {
    _id,
    email,
   role,
  });

    res.json({
      message: "Admin Logged In successfully",
      admin: {
        _id,
        firstName,
        lastName,
        email,
        mobile_no,
       role,
        
        accessToken,
     
      },
    });


  }else{


    res.status(400);
    throw new Error("Invalid Credentials");
  }

});

//// -------------------------------route => Delete/v1/auth/admin/logout----------------------------------------------
///* @desc   admin logout
///? @access Public

const adminLogout = asyncHandler(async (req, res) => {
  const cookies = req.cookies
  if (!cookies?.jwtAdmin) return res.sendStatus(204);//no content

  res.clearCookie("jwtAdmin", { httpOnly: true, sameSite: "strict" });


  res.status(200).json({
      message: " AdminLogged Out successfully"
  });
});


//// -------------------------------route => POST/v1/auth/admin/resend-token----------------------------------------------
//* @desc   resend admin AccessToken
//? @access Public

const adminResendToken = asyncHandler(async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwtAdmin) {
      return res.status(401).json({ message: "Unauthorized, No refresh Token" });
  }

  const refreshToken = cookies.jwtAdmin;
  

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
      if (err) {
      
        res.clearCookie("jwtAdmin", { httpOnly: true, sameSite: "strict" });
         return res.status(401).json({ message: "Unauthorized, refresh token expired" });
      }

      try {
          const foundAdmin = await AdminModel.findById({ _id: decoded.id });

          if (!foundAdmin) {
            res.clearCookie("jwtAdmin", { httpOnly: true, sameSite: "strict" });
              return res.status(401).json({ message: "Unauthorized, admin Not found" });
          }

          const accessToken = generateAccessToken(foundAdmin);

          res.json({ accessToken });
      } catch (error) {
          res.status(500).json({ message: "Internal Server Error", error: error.message });
      }
  });
});

//// -------------------------------exports----------------------------------------------

export { adminLogin,adminResendToken ,adminLogout};