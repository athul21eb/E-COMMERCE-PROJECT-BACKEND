import mongoose from "mongoose";
import bcrypt from "bcrypt";
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  mobile_no: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  role: {
    type: String,
    default: "admin",
  },

  image: {
    type: String,
    default: "",
  },
  timestamps: {
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
});

// Password Salting and hashing
// adminSchema.pre("save", async function (next) {
//     if (!this.isModified('password')) {
//         next();
//     }

//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
// })

//// password compares method

adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Middleware to update the updatedAt timestamp before saving the document

// adminSchema.pre('save', function (next) {

//   this.timestamps.updatedAt = Date.now();

//   next();
// });
const AdminModel = mongoose.model("Admins", adminSchema);
export default AdminModel;
