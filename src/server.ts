import express from "express";
import dotenv from "dotenv";
dotenv.config();

import uploadRoute from "./routes/upload.route";
import reportRoute from "./routes/report.route";
import { errorHandler } from "./middlewares/error.middleware";
import pool from "./config/db";

import pinoHttp from "pino-http";
import { logger } from "./utils/logger";

const app = express();

app.use(pinoHttp({ logger,}));

app.use("/upload", uploadRoute);

app.use("/reports", reportRoute);

const PORT = process.env.PORT || 3000;

// middleware
app.use(express.json());

// health check route
app.get("/", (req, res) => {
  res.json({ message: "SaaScope API is running" });
});

// TEMP DB TEST ROUTE
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json(result.rows);
  } catch (err) {
    console.error("DB Error:", err);

    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown DB error",
    });
  }
});

app.use(errorHandler);

// start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});