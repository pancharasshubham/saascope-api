import pool from "../config/db";

type SaveReportInput = {
  fileName: string;
  processedCount: number;
  skippedCount: number;
  errors: any[];
  vendors: any[];
  totalSavings: number;
};

export async function saveReport(data: SaveReportInput): Promise<string> {
  const query = `
    INSERT INTO reports 
    (file_name, processed_count, skipped_count, errors, vendors, total_savings)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `;

  const values = [
    data.fileName,
    data.processedCount,
    data.skippedCount,
    JSON.stringify(data.errors),
    JSON.stringify(data.vendors),
    data.totalSavings,
  ];

  const res = await pool.query(query, values);
  return res.rows[0].id;
}

export async function getReportById(id: string) {
  const res = await pool.query(
    "SELECT * FROM reports WHERE id = $1",
    [id]
  );

  const report = res.rows[0];

  if (!report) {
    return null;
  }

  return {
    ...report,
    total_savings: Number(report.total_savings),
};
}