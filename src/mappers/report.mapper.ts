type ReportRow = {
  id: string;

  file_name: string;

  processed_count: number;

  skipped_count: number;

  total_savings: number;

  created_at: string;
};

export function mapReportSummary(
  row: ReportRow
) {

  return {
    id: row.id,

    fileName: row.file_name,

    processedCount:
      row.processed_count,

    skippedCount:
      row.skipped_count,

    totalSavings:
      Number(row.total_savings),

    createdAt:
      row.created_at,
  };
}