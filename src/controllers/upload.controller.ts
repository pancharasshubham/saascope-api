import { Request, Response } from "express";
import { parseCSV } from "../services/csv.parser";
import fs from "fs";

export const handleUpload = async (
  req: Request & { file?: Express.Multer.File },
  res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await parseCSV(req.file.path);

    fs.unlink(req.file.path, () => {}); // cleanup temp file after parsing

    return res.json({
      processed: result.valid.length,
      skipped: result.errors.length,
      errors: result.errors,
      records: result.valid,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to process CSV" });
  }
};