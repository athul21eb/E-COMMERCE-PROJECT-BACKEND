import nodemailer from "nodemailer";


import dotenv from "dotenv";
import OtpModel from "./../../models/otp/otp-model.js";
dotenv.config();



function generateNumericOTP(length) {
  let otp = '';
  const digits = '0123456789';

  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }

  return otp;
}


const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASS,
  },
});

const sendOTP = async (email) => {
  try {
    //// OTP generation using otpGenerator
    
    
    const generatedOTP = generateNumericOTP(6);
    
 console.log(generatedOTP);
 
    

    ////otp stored on database
    const storedOTP = await new OtpModel({
      email: email,
      otp: generatedOTP,
    });

    await storedOTP.save();

    ////mail Options

    const mailOptions = {
      from: `"FIRE BOOTS WEBSITE" <${process.env.NODEMAILER_EMAIL}>`, // sender address
      to: email, // list of receivers
      subject: "Verify your Email via OTP Verification", // Subject line
      text: "OTP",
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Verify Your Email Address</h2>
        <p>To complete your registration, please enter the following OTP in the app:</p>
        <p style="font-size: 20px; font-weight: bold; color: #2e6da4;">${generatedOTP}</p>
        <p>This OTP expires in <strong>1 minute</strong>.</p>
        <p>If you did not request this verification, please ignore this email.</p>
        <br>
        <p>Thank you,</p>
        <p><strong>FIRE BOOTS WEBSITE Team</strong></p>
      </div>
    `, // html body
    };

    ////send otp via mail to user email

    const info = await transporter.sendMail(mailOptions);

    console.log("Message sent: %s", info.messageId);
    // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
  } catch (error) {
    console.log(error);
  }
};

export { sendOTP };
