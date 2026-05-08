import { Request, Response } from "express";
import { getReportById } from "../services/report.service";
import { logger } from "../utils/logger";

export const getReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // defensive validation
    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        error: "Invalid report id",
      });
    }

    const report = await getReportById(id, req.user!.userId);

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    return res.json(report);
  } catch (err: unknown) {
    logger.error(err, "Get report error:");
    return res.status(500).json({ error: "Failed to fetch report" });
  }
};