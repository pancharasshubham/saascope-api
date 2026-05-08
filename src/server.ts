import express from "express";
import dotenv from "dotenv";

dotenv.config();

import pinoHttp from "pino-http";

import { logger } from "./utils/logger";

import authRoute from "./routes/auth.route";

import { requestIdMiddleware } from "./middlewares/request-id.middleware";
import { errorHandler } from "./middlewares/error.middleware";

import uploadRoute from "./routes/upload.route";
import reportRoute from "./routes/report.route";

import pool from "./config/db";

const app = express();

const PORT = process.env.PORT || 3000;

// ---------- Core Middleware ----------

// request correlation ids
app.use(requestIdMiddleware);

// structured request logging
app.use(
  pinoHttp({
    logger,

    customProps: (req) => ({
    requestId: req.requestId,
    }),

    genReqId: (req) => req.requestId,
  })
);

// json parser
app.use(express.json());

// ---------- Health Check ----------

app.get("/", (req, res) => {

  logger.info(
    {
      requestId: req.requestId,
    },
    "Health check route accessed"
  );

  res.json({
    message: "SaaScope API is running",
  });
});

// ---------- TEMP DB TEST ROUTE ----------

app.get("/test-db", async (req, res) => {

  try {

    const result = await pool.query(
      "SELECT NOW()"
    );

    logger.info(
      {
        requestId: req.requestId,
      },
      "Database connectivity test successful"
    );

    res.json(result.rows);

  } catch (err: unknown) {

    logger.error(
      {
        requestId: req.requestId,
        err,
      },
      "Database connectivity test failed"
    );

    res.status(500).json({
      error:
        err instanceof Error
          ? err.message
          : "Unknown DB error",
    });
  }
});

// ---------- Routes ----------

app.use("/upload", uploadRoute);

app.use("/reports", reportRoute);

app.use("/auth", authRoute);

// temporary protected route to demonstrate auth middleware

import { authenticate } from "./middlewares/auth.middleware";
app.get(
  "/protected",
  authenticate,
  (req, res) => {

    return res.json({
      message:
        "Protected route accessed",

      user: req.user,
    });
  }
);

// ---------- Global Error Handler ----------

app.use(errorHandler);

// ---------- Server Startup ----------

app.listen(PORT, () => {

  logger.info(
    {
      port: Number(PORT),
      environment:
        process.env.NODE_ENV || "development",
    },
    "Server started successfully"
  );

});