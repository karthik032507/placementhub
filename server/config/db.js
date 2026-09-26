const mongoose = require("mongoose");

// Connects to MongoDB using the URI from .env.
// If the connection fails there is no point running the server, so we exit.
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
