import { Request, Response } from "express";
import fs from "fs";

import { parseCSV } from "../services/csv.parser";
import { runInsightEngine } from "../services/insight.engine";
import { formatInsights } from "../services/result.formatter";
import { saveReport } from "../services/report.service";
import { evaluateDataQuality } from "../services/data-quality.service";

type MulterRequest = Request & {
  file?: Express.Multer.File;
};

export const handleUpload = async (
  req: MulterRequest,
  res: Response
) => {
  try {
    // 1. Validate file
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    // 2. Parse CSV
    const result = await parseCSV(req.file.path);

    // 3. Cleanup temp file
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error("File cleanup failed:", err);
      }
    });

    // 4. Run insight engine
    const config = {
      inactiveThresholdDays:
        Number(process.env.INACTIVE_THRESHOLD_DAYS) || 90,

      duplicateCostMinimum:
        Number(process.env.DUPLICATE_COST_MINIMUM) || 1,
    };

    const rawInsights = runInsightEngine(
      result.valid,
      config
    );

    // 5. Format insights
    const formatted = formatInsights(rawInsights);

    // 6. Save report
    const reportId = await saveReport({
      fileName: req.file.originalname,
      processedCount: result.valid.length,
      skippedCount: result.errors.length,
      errors: result.errors,
      vendors: formatted.vendors,
      totalSavings: formatted.totalSavings,
    });

    // 7. Empty state
    if (formatted.vendors.length === 0) {
      return res.json({
        reportId,
        processed: result.valid.length,
        skipped: result.errors.length,
        errors: result.errors,

        vendors: [],

        totalSavings: 0,

        summary: {
          totalRecords: result.valid.length,
          insightsFound: 0,
          message:
            "No optimization opportunities detected. Provide lastUsedDate for better accuracy.",
        },
      });
    }

    const dataQuality = evaluateDataQuality({
    processed: result.valid.length,
    skipped: result.errors.length,
    validRecords: result.valid,
    });

    // 8. Final response
    return res.json({
      reportId,

      processed: result.valid.length,
      skipped: result.errors.length,
      errors: result.errors,

      vendors: formatted.vendors,
      totalSavings: formatted.totalSavings,
      
      dataQuality,
    });
  }  catch (err: any) {

      if (err?.type === "INVALID_HEADERS") {
        return res.status(400).json({
          error: "Invalid CSV headers",
          missing: err.missing,
        });
      }
    console.error("Upload processing error:", err);

    return res.status(500).json({
      error: "Failed to process CSV",
    });
  }
};