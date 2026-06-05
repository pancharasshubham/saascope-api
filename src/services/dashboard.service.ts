import pool from "../config/db";

export async function getDashboardSummaryData(
  userId: string
) {

  const result = await pool.query(
    `
    SELECT
      COUNT(*) AS total_reports,

      COUNT(*) FILTER (
        WHERE status = 'completed'
      ) AS completed_reports,

      COUNT(*) FILTER (
        WHERE status = 'failed'
      ) AS failed_reports,

      COALESCE(
        SUM(total_savings),
        0
      ) AS total_savings

    FROM reports

    WHERE user_id = $1
    `,
    [userId]
  );

  const row = result.rows[0];

  const totalReports =
    Number(row.total_reports);

  const totalSavings =
    Number(row.total_savings);

  return {
    totalReports,

    completedReports:
      Number(
        row.completed_reports
      ),

    failedReports:
      Number(
        row.failed_reports
      ),

    totalSavings,

    averageSavings:
      totalReports > 0
        ? Math.round(
            totalSavings /
            totalReports
          )
        : 0,
  };
}