import { Request, Response } from "express";
import fs from "fs";

import {
  saveReport,
  markReportFailed,
} from "../services/report.service";

import { processReport }
from "../services/report-processor.service";

import { logger } from "../utils/logger";

type MulterRequest = Request & {
  file?: Express.Multer.File;
};

export const handleUpload = async (
  req: MulterRequest,
  res: Response
) => {

  let reportId: string | null = null;

  try {

    // ---------- File validation ----------
    if (!req.file) {

      logger.warn(
        {
          requestId: req.requestId,
        },
        "Upload attempted without file"
      );

      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    logger.info(
      {
        requestId: req.requestId,
        fileName: req.file.originalname,
      },
      "CSV upload started"
    );

    // ---------- Create processing report EARLY ----------
    reportId = await saveReport({
      userId: req.user!.userId,

      fileName: req.file.originalname,

      filePath: req.file.path,

      processedCount: 0,

      skippedCount: 0,

      errors: [],

      vendors: [],

      totalSavings: 0,

      status: "processing",
    });

    const {
      result,
      formatted,
      dataQuality,
    } = await processReport({
      reportId,
      filePath: req.file.path,
    });

    // ---------- Validation warnings ----------
    if (result.errors.length > 0) {

      logger.warn(
        {
          requestId: req.requestId,
          skipped:
            result.errors.length,
        },
        "CSV rows skipped during validation"
      );
    }

    // ---------- Empty state ----------
    if (
      formatted.vendors.length === 0
    ) {

      logger.info(
        {
          requestId: req.requestId,
          reportId,
        },
        "Upload completed with no optimization opportunities"
      );

      return res.json({
        reportId,

        processed:
          result.valid.length,

        skipped:
          result.errors.length,

        errors:
          result.errors,

        vendors: [],

        totalSavings: 0,

        dataQuality,

        summary: {
          totalRecords:
            result.valid.length,

          insightsFound: 0,

          message:
            "No optimization opportunities detected. Provide lastUsedDate for better accuracy.",
        },
      });
    }

    // ---------- Success ----------
    logger.info(
      {
        requestId: req.requestId,

        reportId,

        processed:
          result.valid.length,

        insightsFound:
          formatted.vendors.length,

        totalSavings:
          formatted.totalSavings,
      },
      "CSV upload processed successfully"
    );

    // ---------- Final response ----------
    return res.json({
      reportId,

      processed:
        result.valid.length,

      skipped:
        result.errors.length,

      errors:
        result.errors,

      vendors:
        formatted.vendors,

      totalSavings:
        formatted.totalSavings,

      dataQuality,
    });

  } catch (err: unknown) {

    // ---------- Persist failure state ----------
    if (reportId) {

      await markReportFailed(
        reportId
      );
    }

    // ---------- Invalid headers ----------
    if (
      typeof err === "object" &&
      err !== null &&
      "type" in err &&
      err.type === "INVALID_HEADERS"
    ) {

      logger.warn(
        {
          requestId: req.requestId,
          err,
        },
        "CSV upload rejected due to invalid headers"
      );

      return res.status(400).json({
        error:
          "Invalid CSV headers",

        missing:
          (err as any).missing,
      });
    }

    logger.error(
      {
        requestId: req.requestId,
        err,
        reportId,
      },
      "Upload processing failed"
    );

    return res.status(500).json({
      error:
        "Failed to process CSV",

      reportId,
    });
  }
};