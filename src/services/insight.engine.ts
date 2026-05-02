export type SaaSRecord = {
  vendorName: string;
  cost: number;
  seats: number;
  billingCycle: "monthly" | "annual";
  lastUsedDate?: string;
};

export type Insight = {
  type: "inactive" | "duplicate" | "overpaying";
  vendor: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  estimatedSavings: number;
};

export type InsightConfig = {
  inactiveThresholdDays: number;
  duplicateCostMinimum: number;
};

function normalizeVendor(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd)\b/g, "")
    .trim();
}

export function runInsightEngine(
  records: SaaSRecord[],
  config: InsightConfig
): Insight[] {
  const insights: Insight[] = [];

  const now = new Date();

  // -------------------
  // 1. INACTIVE
  // -------------------
  for (const record of records) {
    if (!record.lastUsedDate) continue;

    const lastUsed = new Date(record.lastUsedDate);
    const diffDays =
      (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > config.inactiveThresholdDays) {
      insights.push({
        type: "inactive",
        vendor: record.vendorName,
        reason: `No usage in ${Math.floor(diffDays)} days`,
        confidence: "high",
        estimatedSavings: record.cost,
      });
    }
  }

  // -------------------
  // 2. DUPLICATES
  // -------------------
  const groups: Record<string, SaaSRecord[]> = {};

  for (const record of records) {
    const key = normalizeVendor(record.vendorName);
    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
  }

  for (const key in groups) {
    const group = groups[key];
    if (group.length > 1) {
      const totalCost = group.reduce((sum, r) => sum + r.cost, 0);
      const keepOneCost = Math.min(...group.map((r) => r.cost));
      const savings = totalCost - keepOneCost;

      group.forEach((record) => {
        insights.push({
          type: "duplicate",
          vendor: record.vendorName,
          reason: "Multiple subscriptions detected",
          confidence: "medium",
          estimatedSavings: savings,
        });
      });
    }
  }

  // -------------------
  // 3. OVERPAYING
  // -------------------
  for (const record of records) {
    if (
      record.seats > 1 &&
      !record.lastUsedDate &&
      record.cost > config.duplicateCostMinimum
    ) {
      const perSeat = record.cost / record.seats;
      const savings = perSeat * (record.seats - 1);

      insights.push({
        type: "overpaying",
        vendor: record.vendorName,
        reason: "Multiple seats with no usage visibility",
        confidence: "low",
        estimatedSavings: savings,
      });
    }
  }

  return insights;
}
