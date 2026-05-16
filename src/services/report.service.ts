import pool from "../config/db";

type SaveReportInput = {
  userId: string;

  fileName: string;

  processedCount: number;

  skippedCount: number;

  errors: unknown[];

  vendors: unknown[];

  totalSavings: number;

  status: "processing" | "completed" | "failed";
};

type UpdateReportInput = {
  reportId: string;

  processedCount: number;

  skippedCount: number;

  errors: unknown[];

  vendors: unknown[];

  totalSavings: number;

  status: "completed" | "failed";
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
      total_savings,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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

    input.status,
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
      status,
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
  limit: number,
  search?: string,
  minSavings?: number
) {

  const offset =
    (page - 1) * limit;

  // ---------- Dynamic filters ----------
  const conditions = [
    `user_id = $1`
  ];

  const values: unknown[] = [
    userId
  ];

  let paramIndex = 2;

  // ---------- Search ----------
  if (search) {

    conditions.push(
      `file_name ILIKE $${paramIndex}`
    );

    values.push(`%${search}%`);

    paramIndex++;
  }

  // ---------- Min savings ----------
  if (
    typeof minSavings === "number"
  ) {

    conditions.push(
      `total_savings >= $${paramIndex}`
    );

    values.push(minSavings);

    paramIndex++;
  }

  // ---------- WHERE clause ----------
  const whereClause =
    conditions.join(" AND ");

  // ---------- Reports query ----------
  const reportsQuery = `
    SELECT
      id,
      file_name,
      processed_count,
      skipped_count,
      total_savings,
      status,
      created_at
        FROM reports
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex}
        OFFSET $${paramIndex + 1}
  `;

  values.push(limit);
  values.push(offset);

  const reportsResult =
    await pool.query(
      reportsQuery,
      values
    );

  // ---------- Count query ----------
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM reports
    WHERE ${whereClause}
  `;

  const countValues =
    values.slice(0, values.length - 2);

  const countResult =
    await pool.query(
      countQuery,
      countValues
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

export async function updateReportResult(
  input: UpdateReportInput
) {

  const query = `
    UPDATE reports
    SET
      processed_count = $1,
      skipped_count = $2,
      errors = $3,
      vendors = $4,
      total_savings = $5,
      status = $6
    WHERE id = $7
  `;

  const values = [
    input.processedCount,
    input.skippedCount,
    JSON.stringify(input.errors),
    JSON.stringify(input.vendors),
    input.totalSavings,
    input.status,
    input.reportId,
  ];

  await pool.query(
    query,
    values
  );
}

export async function markReportFailed(
  reportId: string
) {

  await pool.query(
    `
    UPDATE reports
    SET status = 'failed'
    WHERE id = $1
    `,
    [reportId]
  );
}