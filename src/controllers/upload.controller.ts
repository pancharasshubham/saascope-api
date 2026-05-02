import { Request, Response } from "express";
import fs from "fs";
import { parseCSV } from "../services/csv.parser";
import { runInsightEngine } from "../services/insight.engine";
import { formatInsights } from "../services/result.formatter";

type MulterRequest = Request & { file?: Express.Multer.File };

export const handleUpload = async (req: MulterRequest, res: Response) => {
  try {
    // 1. Validate file
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // 2. Parse CSV
    const result = await parseCSV(req.file.path);

    // 3. Cleanup temp file (non-blocking)
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("File cleanup failed:", err);
    });

    // 4. Run insight engine
    const config = {
      inactiveThresholdDays:
        Number(process.env.INACTIVE_THRESHOLD_DAYS) || 90,
      duplicateCostMinimum:
        Number(process.env.DUPLICATE_COST_MINIMUM) || 1,
    };

    const rawInsights = runInsightEngine(result.valid, config);

    // 5. Format insights (vendor-level)
    const formatted = formatInsights(rawInsights);

    // 6. Explicit "no insights" response
    if (formatted.vendors.length === 0) {
      return res.json({
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

    // 7. Final response
    return res.json({
      processed: result.valid.length,
      skipped: result.errors.length,
      errors: result.errors,
      vendors: formatted.vendors,
      totalSavings: formatted.totalSavings,
    });
  } catch (err) {
    console.error("Upload processing error:", err);

    return res.status(500).json({
      error: "Failed to process CSV",
    });
  }
};