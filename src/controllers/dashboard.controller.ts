import { Request, Response } from "express";

import {
  getDashboardSummaryData,
} from "../services/dashboard.service";

import { logger } from "../utils/logger";

export async function getDashboardSummary(
  req: Request,
  res: Response
) {

  try {

    const summary =
      await getDashboardSummaryData(
        req.user!.userId
      );

    return res.json(summary);

  } catch (err: unknown) {

    logger.error(
      {
        requestId: req.requestId,
        err,
      },
      "Failed to retrieve dashboard summary"
    );

    return res.status(500).json({
      error:
        "Failed to retrieve dashboard summary",
    });
  }
}