const express = require("express");
const connectDB = require("./config/db"); // Import MongoDB connection

require("dotenv").config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json()); // Parse JSON data
app.use(require("cors")()); // Enable CORS

// Test Route
app.get("/", (req, res) => {
  res.send("🚀 RESQNECT Backend is running!");
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
