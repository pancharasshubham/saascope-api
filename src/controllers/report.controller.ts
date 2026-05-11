import { Request, Response } from "express";
import { getReportById, getUserReports } from "../services/report.service";
import { logger } from "../utils/logger";
import { mapReportSummary } from "../mappers/report.mapper";

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

export async function listReports(
  req: Request,
  res: Response
) {

  try {

    const reports =
      await getUserReports(
        req.user!.userId
      );

    logger.info(
      {
        requestId: req.requestId,
        userId: req.user!.userId,
        reportsFound: reports.length,
      },
      "User reports retrieved successfully"
    );

  const mappedReports =
  reports.map(mapReportSummary);

  return res.json({
    reports: mappedReports,
  });

  } catch (err: unknown) {

    logger.error(
      {
        requestId: req.requestId,
        err,
      },
      "Failed to retrieve user reports"
    );

    return res.status(500).json({
      error: "Failed to retrieve reports",
    });
  }
}