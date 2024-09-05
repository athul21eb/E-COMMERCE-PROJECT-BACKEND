import mongoose from "mongoose";

const connectMongoDB = async () => {
  // try {
  //   const connection = await mongoose.connect(process.env.MONGO_URI);
  //   console.log(`MongoDB connnected - ${connection.connection.host}`);
  // } catch (error) {
  //   console.error(`Error - ${error}`);
  //   process.exit(1);
  // }
  await mongoose
    .connect(process.env.MONGO_URI)
    .then((res) =>
      console.log(`MongoDB connnected - ${res.connection.host}`)
    )
    .catch((error) => {
      console.error(`Error - ${error}`);
      process.exit(1);
    });
};

export default connectMongoDB;
