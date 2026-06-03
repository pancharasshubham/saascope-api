import { Request, Response } from "express";
import { getReportById, getUserReports, markReportProcessing, markReportFailed } from "../services/report.service";
import { logger } from "../utils/logger";
import { mapReportSummary } from "../mappers/report.mapper";
import { processReport }
from "../services/report-processor.service";

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

    // ---------- Query params ----------
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 10,
        1
      ),
      50
    );

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : undefined;

    let minSavings: number | undefined;

    if (req.query.minSavings !== undefined) {

      const parsed = Number(
        req.query.minSavings
      );

      if (Number.isNaN(parsed)) {

        return res.status(400).json({
          error:
            "minSavings must be a valid number",
          });
        }

      minSavings = parsed;
    }

    // ---------- Fetch reports ----------
    const result =
      await getUserReports(
        req.user!.userId,
        page,
        limit,
        search,
        minSavings
      );

    const mappedReports =
      result.reports.map(
        mapReportSummary
      );

    const totalPages =
      Math.ceil(
        result.total / limit
      );

    logger.info(
      {
        requestId: req.requestId,
        userId: req.user!.userId,
        page,
        limit,
        reportsFound:
          mappedReports.length,
      },
      "User reports retrieved successfully"
    );

    return res.json({
      reports: mappedReports,

      pagination: {
        page,
        limit,

        total:
          result.total,

        totalPages,
      },
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
      error:
        "Failed to retrieve reports",
    });
  }
}

export async function retryReport(
  req: Request,
  res: Response
) {

  let retryReportId: string | null = null;

  try {

    const reportId =
      Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const report =
      await getReportById(
        reportId,
        req.user!.userId
      );

    if (!report) {

      return res.status(404).json({
        error: "Report not found",
      });
    }

    if (report.status !== "failed") {

      return res.status(400).json({
        error:
          "Only failed reports can be retried",
      });
    }

    retryReportId = report.id;

    await markReportProcessing(
      report.id
    );

    logger.info(
      {
        requestId: req.requestId,
        reportId: report.id,
      },
      "Report retry started"
    );

    await processReport({
      reportId: report.id,
      filePath: report.file_path,
    });

    logger.info(
      {
        requestId: req.requestId,
        reportId: report.id,
      },
      "Report retry completed successfully"
    );

    return res.json({
      message:
        "Report reprocessed successfully",

      reportId: report.id,
    });

  } catch (err: unknown) {

    if (retryReportId) {
      await markReportFailed(
        retryReportId
      );
    }

    logger.error(
      {
        requestId: req.requestId,
        err,
      },
      "Report retry failed"
    );

    return res.status(500).json({
      error:
        "Failed to retry report",
    });
  }
}