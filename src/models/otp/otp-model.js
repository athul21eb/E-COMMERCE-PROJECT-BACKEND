import mongoose from 'mongoose'
import bcrypt from 'bcrypt'


const OtpSchema = mongoose.Schema({

    email: {
        type: String,
        trim: true,
        lowercase: true,
    },
    otp: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60
    }
})

OtpSchema.methods.matchOTP = async function(enterOtp){
    return await bcrypt.compare(enterOtp,this.otp);
}

OtpSchema.pre("save", async function (next) {
   

    const salt = await bcrypt.genSalt(10);
    this.otp = await bcrypt.hash(this.otp, salt);
})

const OtpModel =  mongoose.model("Otp",OtpSchema);
export default OtpModel ;