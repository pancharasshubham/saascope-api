import { Request, Response } from "express";

import { registerUser } from "../services/auth.service";

import { loginUser } from "../services/auth.service";

import { generateToken }
from "../services/token.service";

import { logger } from "../utils/logger";

export async function register(
  req: Request,
  res: Response
) {
  try {

    const { email, password } = req.body;

    // ---------- Validation ----------
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters",
      });
    }

    // ---------- Register ----------
    const user = await registerUser({
      email,
      password,
    });

    logger.info(
      {
        requestId: req.requestId,
        userId: user.id,
      },
      "User registered successfully"
    );

    return res.status(201).json({
      message: "User registered successfully",

      user: {
        id: user.id,
        email: user.email,
      },
    });

  } catch (err: unknown) {

    if (
      err instanceof Error &&
      err.message === "EMAIL_ALREADY_EXISTS"
    ) {

      logger.warn(
        {
          requestId: req.requestId,
        },
        "Duplicate registration attempt"
      );

      return res.status(409).json({
        error: "Email already registered",
      });
    }

    logger.error(
      {
        requestId: req.requestId,
        err,
      },
      "User registration failed"
    );

    return res.status(500).json({
      error: "Failed to register user",
    });
  }
}

export async function login(
  req: Request,
  res: Response
) {
  try {

    const { email, password } = req.body;

    // ---------- Validation ----------
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // ---------- Login ----------
    const user = await loginUser(
      email,
      password
    );

    // ---------- Generate token ----------
    const token = generateToken({
      userId: user.id,
    });

    logger.info(
      {
        requestId: req.requestId,
        userId: user.id,
      },
      "User logged in successfully"
    );

    return res.json({
      token,

      user: {
        id: user.id,
        email: user.email,
      },
    });

  } catch (err: unknown) {

    if (
      err instanceof Error &&
      err.message === "INVALID_CREDENTIALS"
    ) {

      logger.warn(
        {
          requestId: req.requestId,
        },
        "Invalid login attempt"
      );

      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    logger.error(
      {
        requestId: req.requestId,
        err,
      },
      "User login failed"
    );

    return res.status(500).json({
      error: "Failed to login user",
    });
  }
}