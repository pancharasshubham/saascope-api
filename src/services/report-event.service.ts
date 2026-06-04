import pool from "../config/db";

export async function createReportEvent(
  reportId: string,
  eventType: string,
  metadata?: Record<string, unknown>
) {

  await pool.query(
    `
    INSERT INTO report_events
    (
      report_id,
      event_type,
      metadata
    )
    VALUES ($1, $2, $3)
    `,
    [
      reportId,
      eventType,
      metadata || {},
    ]
  );
}

export async function getReportEvents(
  reportId: string
) {

  const result =
    await pool.query(
      `
      SELECT
        event_type,
        metadata,
        created_at
      FROM report_events
      WHERE report_id = $1
      ORDER BY created_at ASC
      `,
      [reportId]
    );

  return result.rows;
}

