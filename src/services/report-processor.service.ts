import { parseCSV } from "./csv.parser";
import { runInsightEngine } from "./insight.engine";
import { formatInsights } from "./result.formatter";
import { evaluateDataQuality } from "./data-quality.service";
import { updateReportResult } from "./report.service";
import { createReportEvent } from "./report-event.service";

type ProcessReportInput = {
  reportId: string;
  filePath: string;
};

export async function processReport(
  input: ProcessReportInput
) {

  await createReportEvent(
    input.reportId,
    "processing_started"
  );

  console.log(
  "EVENT CREATED: processing_started"
  );

  const result = await parseCSV(
    input.filePath
  );

  // ---------- Test error handling ----------
  if (process.env.TEST_FAILURE === "true") {
    throw new Error("TEST_FAILURE");
  }

  const config = {
    inactiveThresholdDays:
      Number(
        process.env.INACTIVE_THRESHOLD_DAYS
      ) || 90,

    duplicateCostMinimum:
      Number(
        process.env.DUPLICATE_COST_MINIMUM
      ) || 1,
  };

  const rawInsights =
    runInsightEngine(
      result.valid,
      config
    );

  const formatted =
    formatInsights(rawInsights);

  const dataQuality =
    evaluateDataQuality({
      processed:
        result.valid.length,

      skipped:
        result.errors.length,

      validRecords:
        result.valid,
    });

  await updateReportResult({
    reportId: input.reportId,

    processedCount:
      result.valid.length,

    skippedCount:
      result.errors.length,

    errors:
      result.errors,

    vendors:
      formatted.vendors,

    totalSavings:
      formatted.totalSavings,

    status: "completed",
  });

  await createReportEvent(
    input.reportId,
    "processing_completed"
  );

  console.log(
  "EVENT CREATED: processing_completed"
  );

  return {
    result,
    formatted,
    dataQuality,
  };
}