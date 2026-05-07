import { SaaSRecord, DataQuality } from "../models/types";

type Input = {
  processed: number;
  skipped: number;
  validRecords: SaaSRecord[];
};

export function evaluateDataQuality({
  processed,
  skipped,
  validRecords,
}: Input): DataQuality {

  let score = 100;

  const issues: string[] = [];

  // skipped rows penalty
  if (skipped > 0) {
    score -= skipped * 10

    issues.push(`${skipped} rows failed validation`);
  }

  // missing usage data penalty
  const missingUsageCount = validRecords.filter(
    (r) => !r.lastUsedDate
  ).length;

  if (missingUsageCount > 0) {
    score -= missingUsageCount * 5

    issues.push(
      `${missingUsageCount}  ${
        missingUsageCount === 1 ? "vendor" : "vendors"
    } missing usage data`
    );
  }

  // clamp
  score = Math.max(0, score);

  let level: "high" | "medium" | "low";

  if (score >= 85) {
    level = "high";
  } else if (score >= 60) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    score,
    level,
    issues,
  };
}