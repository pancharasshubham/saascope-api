import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

// middleware
app.use(express.json());

// health check route
app.get("/", (req, res) => {
  res.json({ message: "SaaScope API is running" });
});

// start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});