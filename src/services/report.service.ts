import pool from "../config/db";

type SaveReportInput = {
  userId: string;

  fileName: string;

  processedCount: number;

  skippedCount: number;

  errors: unknown[];

  vendors: unknown[];

  totalSavings: number;
};

export async function saveReport(
  input: SaveReportInput
): Promise<string> {

  const query = `
    INSERT INTO reports (
      user_id,
      file_name,
      processed_count,
      skipped_count,
      errors,
      vendors,
      total_savings
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `;

  const values = [
    input.userId,

    input.fileName,

    input.processedCount,

    input.skippedCount,

    JSON.stringify(input.errors),

    JSON.stringify(input.vendors),

    input.totalSavings,
  ];

  const result = await pool.query(
    query,
    values
  );

  return result.rows[0].id;
}

export async function getReportById(
  reportId: string,
  userId: string
) {

  const query = `
    SELECT
      id,
      user_id,
      file_name,
      processed_count,
      skipped_count,
      errors,
      vendors,
      total_savings,
      created_at
    FROM reports
    WHERE id = $1
    AND user_id = $2
  `;

  const values = [
    reportId,
    userId,
  ];

  const result = await pool.query(
    query,
    values
  );

  return result.rows[0] || null;
}

export async function getUserReports(
  userId: string,
  page: number,
  limit: number
) {

  const offset =
    (page - 1) * limit;

  // ---------- Paginated reports ----------
  const reportsQuery = `
    SELECT
      id,
      file_name,
      processed_count,
      skipped_count,
      total_savings,
      created_at
    FROM reports
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    OFFSET $3
  `;

  const reportsValues = [
    userId,
    limit,
    offset,
  ];

  const reportsResult =
    await pool.query(
      reportsQuery,
      reportsValues
    );

  // ---------- Total count ----------
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM reports
    WHERE user_id = $1
  `;

  const countResult =
    await pool.query(
      countQuery,
      [userId]
    );

  return {
    reports:
      reportsResult.rows,

    total:
      Number(
        countResult.rows[0].total
      ),
  };
}