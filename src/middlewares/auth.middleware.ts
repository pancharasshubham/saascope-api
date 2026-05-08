import { Request, Response, NextFunction } from "express";

import jwt from "jsonwebtoken";

import { logger } from "../utils/logger";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not configured"
  );
}

type TokenPayload = {
  userId: string;
};

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {

  try {

    const authHeader =
      req.headers.authorization;

    // ---------- Missing header ----------
    if (!authHeader) {

      logger.warn(
        {
          requestId: req.requestId,
        },
        "Authentication attempted without authorization header"
      );

      return res.status(401).json({
        error: "Authorization token required",
      });
    }

    // ---------- Validate format ----------
    const parts = authHeader.split(" ");

    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer"
    ) {

      logger.warn(
        {
          requestId: req.requestId,
        },
        "Malformed authorization header"
      );

      return res.status(401).json({
        error: "Invalid authorization format",
      });
    }

    const token = parts[1];

    // ---------- Verify token ----------
    const decoded = jwt.verify(
      token,
      JWT_SECRET as string
    ) as TokenPayload;

    // ---------- Inject user ----------
    req.user = {
      userId: decoded.userId,
    };

    logger.info(
      {
        requestId: req.requestId,
        userId: decoded.userId,
      },
      "Request authenticated successfully"
    );

    next();

  } catch (err: unknown) {

    logger.warn(
      {
        requestId: req.requestId,
        err,
      },
      "JWT authentication failed"
    );

    return res.status(401).json({
      error: "Invalid or expired token",
    });
  }
}