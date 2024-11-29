import mongoose from "mongoose";

const connectMongoDB = async () => {
  await mongoose
    .connect(process.env.MONGO_URI, {
      maxPoolSize: 20, // Set maximum number of concurrent connections
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds if the server is unreachable
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    })
    .then((res) =>
      console.log(`MongoDB connected - ${res.connection.host}`)
    )
    .catch((error) => {
      console.error(`Error connecting to MongoDB - ${error.message}`);
      process.exit(1); // Exit process if connection fails
    });

  // Log successful connection events for debugging
  mongoose.connection.on("connected", () => {
    console.log("Mongoose connected to the database.");
  });

  // Log disconnection events for debugging
  mongoose.connection.on("disconnected", () => {
    console.log("Mongoose connection disconnected.");
  });

  // Handle errors during runtime
  mongoose.connection.on("error", (err) => {
    console.error(`Mongoose connection error: ${err.message}`);
  });

  // Handle application termination gracefully
  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("Mongoose connection closed due to application termination.");
    process.exit(0);
  });
};

export default connectMongoDB;
