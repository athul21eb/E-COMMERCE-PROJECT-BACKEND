import asyncHandler from "express-async-handler";
import UserModel from "../../../models/user/user-model.js";
import { sendOTP } from "../../../utils/OTP/OTP-verification.js";
import OtpModel from "../../../models/otp/otp-model.js";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../../utils/JWT/generate-JWT.js";

//// -------------------------------route => POST/v1/auth/user/google-signIn----------------------------------------------
///* @desc  sigle sign on using google auth
///? @access Public

const googleSignIn = asyncHandler(async (req, res) => {
  const { email, displayName, photoURL, uid } = req.body;
  console.log(req.body);
  ////validation
  if (!email || !displayName || !uid) {
    res.status(400);
    throw new Error("  All fields are required ");
  }
  // Find the user by email
  let user = await UserModel.findOne({ email });

  if (user) {
    if (user.isBlocked) {
      res.status(403);
      throw new Error(`${user.firstName}'s account is blocked !`);
    }

    // Case 1: User exists and has already linked their Google account
    if (user.googleId && user.googleId === uid) {
      const {
        _id,
        firstName,
        lastName,
        mobile_no,
        DOB,
        role,photo,
        isVerified,
        isBlocked,
      } = user;

      // Generate tokens
      const accessToken = await generateAccessToken({
        _id,
        email,
        role,
      });
      await generateRefreshToken(res, {
        _id,
        email,
        role,
      });

      return res.json({
        message: "User  logged in successfully using Google Sign-in",
        user: {
          _id,
        firstName,
        lastName,
        mobile_no,
        DOB,email,
        role,photo,
        isVerified,
        isBlocked,
          accessToken,
        },
      });
    }

    // Case 2: User exists but hasn't linked their Google account yet
    if (!user.googleId) {
      // Link the Google account to the existing user
      user.googleId = uid;

      user.photo = photoURL; // Optional: update profile picture
      await user.save();

      const {
        _id,
        firstName,
        lastName,
        mobile_no,
        DOB,
        role,photo,
        isVerified,
        isBlocked,
      } = user;

      // Generate tokens
      const accessToken = await generateAccessToken({
        _id,
        email,
        role,
      });
      await generateRefreshToken(res, {
        _id,
        email,
        role,
      });

      return res.json({
        message: "Google account linked, user  logged in successfully",
        user: {
          _id,
        firstName,
        lastName,
        mobile_no,
        DOB,email,
        role,photo,
        isVerified,
        isBlocked,
          accessToken,
        },
      });
    }

    // Case 3: Email exists but with a different Google account
    res.status(400);
    throw new Error(
      "Email already exists with a different Google account (google uid is not match). Please use the correct account to sign in."
    );
  }

  // Case 4: User does not exist, create a new user
  user = new UserModel({
    email,
    firstName: displayName,
    photo: photoURL,
    googleId: uid,
    isVerified: true,
    verificationExpires: "",
    // Mark as verified since they signed in with Google
  });

  await user.save();

  const {
    _id,
    firstName,
    lastName,
    mobile_no,
    DOB,
    role,photo,
    isVerified,
    isBlocked, 
  } =
    user;

  // Generate tokens
  const accessToken = await generateAccessToken({
    _id,
    email,
    role,
  });
  await generateRefreshToken(res, {
    _id,
    email,
    role,
  });

  return res.status(201).json({
    message: "New user created, verified, and logged in using Google Sign-in",
    user: {
      _id,
        firstName,
        lastName,
        mobile_no,
        DOB,email,
        role,photo,
        isVerified,
        isBlocked,
      accessToken,
    },
  });
});

//// -------------------------------route => POST/v1/auth/user/login----------------------------------------------
///* @desc   user Login
///? @access Public

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  ////validation
  if (!email || !password) {
    res.status(400);
    throw new Error("  All fields are required ");
  }

  const loginUser = await UserModel.findOne({ email });

  if (loginUser && loginUser.password === "" && loginUser.googleId) {
    res.status(400);
    throw new Error(`${loginUser.firstName} please use google sign in !`);
  }
  
  //// checking =>   find  user with given credentials and checking the password match
  if (loginUser && (await loginUser.matchPassword(password))) {
    if (loginUser.isBlocked) {
      res.status(403);
      throw new Error(`${loginUser.firstName}'s account is blocked !`);
    }

    const {
      _id,
        firstName,
        lastName,
        mobile_no,
        DOB,
        role,photo,
        isVerified,
        isBlocked,
    } = loginUser;

    if (isVerified) {
      //// generate tokens
      const accessToken = await generateAccessToken({
        _id,
        email,
        role,
      });
      await generateRefreshToken(res, {
        _id,
        email,
        role,
      });

      res.json({
        message: "user Logged In successfully",
        user: {
          _id,
          firstName,
          lastName,
          mobile_no,
          DOB,email,
          role,photo,
          isVerified,
          isBlocked,
          accessToken,
        },
      });
    } else {
      await sendOTP(email);
      res.status(301);
      throw new Error("Please verify your email first");
    }
  } else {
    res.status(400);
    throw new Error(" Invalid  credentials");
  }
});

//// -------------------------------route => Delete/v1/auth/user/logout----------------------------------------------
///* @desc   user logout
///? @access Public

const logout = asyncHandler(async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwtUser) return res.sendStatus(204); //no content

  res.clearCookie("jwtUser", { httpOnly: true, sameSite: "strict" });

  res.status(200).json({
    message: " user Logged Out successfully",
  });
});

//// -------------------------------route => POST/v1/auth/user/signUp----------------------------------------------
///* @desc   Register a new user
///? @access Public

const signUp = asyncHandler(async (req, res) => {
  const { firstName, lastName, password, email, mobile_no } = req.body;

  ////validation
  if (!firstName || !lastName || !password || !email || !mobile_no) {
    res.status(400);
    throw new Error(" All fields are required  ");
  }

  //// checking =>  is there any existing user with same email in database
  const existingEmailUser = await UserModel.findOne({ email });

  if (existingEmailUser) {
    console.log(existingEmailUser);

    if (existingEmailUser.googleId) {
      res.status(400);
      throw new Error("user email already existed by using google signIn ");
    }
    res.status(400);
    throw new Error("user email already existed");
  }

  // checking => is there any existing user with same mobile_no in database
  // const existingUser = await UserModel.findOne({ mobile_no });

  // if (existingUser) {
  //   res.status(400);
  //   throw new Error("user mobile already existed");
  // }

  //// register user with isVerified false
  const createdUser = await UserModel.create({
    firstName,
    lastName,
    password,
    email,
    mobile_no,
  });

  if (createdUser) {
    ////send otp to user email
    await sendOTP(createdUser.email);

    res.status(200).json({
      message: "Otp sended Successfully, please verify your email ",
      email: createdUser.email,
    });
  } else {
    res.status(500);
    throw new Error("Server error: User could not be created");
  }
});

//// -------------------------------route => POST/v1/auth/user/resend-otp----------------------------------------------
///* @desc   resend a otp to user
///? @access Public
const resendOtp = asyncHandler(async (req, res) => {
  const { email, forgotPassword } = req.body;

  const verifiedUser = await UserModel.findOne({ email: email });

  if (!verifiedUser) {
    res.status(400);

    throw new Error("User doest exist ,please Sign Up again");
  }

  if (verifiedUser.isVerified && !forgotPassword) {
    res.status(400);
    throw new Error("User Already verified");
  }
  if (forgotPassword && !verifiedUser.isVerified) {
    res.status(400);
    throw new Error("User Not verified");
  }

  await sendOTP(email);

  res.status(200).json({
    message: `Otp ${
      forgotPassword ? "Sended" : "ReSended"
    } Successfully, please verify your email `,
    email: email,
  });
});

//// -------------------------------route => POST/v1/auth/user/verify-otp----------------------------------------------
///* @desc   verify a otp
///? @access Public

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp, forgotPassword } = req.body;
  ////validation
  if (!email || !otp) {
    res.status(400);
    throw new Error("  All fields are required ");
  }
  ////get all otp of user email and sort by latest otp first
  const userVerificationRecords = await OtpModel.find({ email }).sort({
    createdAt: -1,
  });

  //// check  there is no Otp
  if (userVerificationRecords.length <= 0) {
    res.status(400);
    throw new Error("Otp doest exist. Proceed with ReSend Otp");
  }

  const latestOtp = userVerificationRecords[0];

  ////match otp
  if (await latestOtp.matchOTP(otp)) {
    //// delete all otp  of that user email
    await OtpModel.deleteMany({ email });

    if (forgotPassword) {
      return res.json({
        message: `Otp verified,Now You can reset password `,
        user: { email: email, resetPassword: true },
      });
    }

    ////update user details to verified User
    const verifiedUser = await UserModel.findOneAndUpdate(
      { email },
      {
        $set: { isVerified: true, verificationExpires: null },
      },
      { new: true }
    );

    // This will log the updated user document

    if (verifiedUser) {
      const {
        _id,
        firstName,
        lastName,
        mobile_no,
        DOB,
        role,photo,
        isVerified,
        isBlocked,
      } = verifiedUser;

      //// generate tokens
      const accessToken = await generateAccessToken({
        _id,
        email,
        role,
      });
      await generateRefreshToken(res, {
        _id,
        email,
        role,
      });

      res.json({
        message: "User Verified successfully",
        user: {
          _id,
        firstName,
        lastName,
        mobile_no,
        DOB,email,
        role,photo,
        isVerified,
        isBlocked,
          accessToken,
        },
      });
    } else {
      res.status(400);
      throw new Error("User doest exist. please Signup Again");
    }
  } else {
    res.status(400);
    throw new Error("Otp is invalid");
  }
});

//// -------------------------------route => POST/v1/auth/user/resend-token----------------------------------------------
///* @desc   resend user AccessToken
///? @access Public

const resendToken = asyncHandler(async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwtUser)
    return res.status(401).json({ message: "Unauthorized , No refresh Token" });

  const refreshToken = cookies.jwtUser;
  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    asyncHandler(async (err, decoded) => {
      if (err) return res.status(403).json({ message: "Forbidden " });

      const foundUser = await UserModel.findById({ _id: decoded.id });

      if (!foundUser)
        return res
          .status(401)
          .json({ message: "Unauthorized ,user Not found" });

      const accessToken = generateAccessToken(foundUser);
      res.json({ accessToken });
    })
  );
});

//// -------------------------------route => POST/v1/auth/user/reset-password----------------------------------------------
///* @desc   reset Password
///? @access Public

const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  // Validation
  if (!newPassword || !confirmPassword) {
    res.status(400);
    throw new Error("Both password fields are required");
  }

  if (newPassword !== confirmPassword) {
    res.status(400);
    throw new Error("Passwords do not match");
  }

  // Password strength validation (example)
  const passwordValidationRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

  if (!passwordValidationRegex.test(newPassword)) {
    res.status(400);
    throw new Error(
      "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character."
    );
  }

  const user = await UserModel.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (await user.matchPassword(newPassword)) {
    res.status(404);
    throw new Error("Cannot assign Old password as a New Password");
  }
  // Set the new password
  user.password = newPassword; // This triggers the pre('save') hook to hash the password

  // Save the user, which will hash the password via the pre('save') hook
  await user.save();

  res.status(200).json({
    message: "Password reset successfully",
    user: null,
  });
});
//// -------------------------------route => PUT/v1/auth/user/updateUserDetails----------------------------------------------
///* @desc   Update user details
///? @access Private (User must be authenticated)

const updateUserDetails = asyncHandler(async (req, res) => {
  const { firstName, lastName, dob,  mobile, newPassword, confirmPassword, photo } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !dob  || !mobile) {
    res.status(400);
    throw new Error("All fields are required");
  }

  // Ensure newPassword and confirmPassword match if provided
  if (newPassword && newPassword !== confirmPassword) {
    res.status(400);
    throw new Error("Passwords do not match");
  }

  // Find the user by ID
  const user = await UserModel.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

 

 

  // Update the user's details
  user.firstName = firstName;
  user.lastName = lastName;
  user.DOB = dob;
 
  user.mobile_no = mobile;


  if (newPassword) {

    if(await user.matchPassword(newPassword)){
      res.status(400);
      throw new Error("Can't Set Old password as a new password ");
    }
    user.password = newPassword; // The password should be hashed automatically in the UserModel
  }
  if (photo) {
    user.photo = photo; // Update photo URL if provided
  }

  // Save the updated user to the database
  const updatedUser = await user.save();

  res.status(200).json({
    message: "User details updated successfully",
    user: {
      
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      DOB: updatedUser.DOB,
      mobile_no: updatedUser.mobile_no,
      photo: updatedUser.photo,
    },
  });
});

<<<<<<< HEAD
=======
///hello 44444
>>>>>>> feature



//// -------------------------------exports----------------------------------------------

export {
  login,
  logout,
  googleSignIn,
  signUp,
  resendOtp,
  verifyOtp,
  resendToken,
  resetPassword,
  updateUserDetails
  
};
