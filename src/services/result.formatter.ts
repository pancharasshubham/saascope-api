type Insight = {
  type: "inactive" | "duplicate" | "overpaying";
  vendor: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  estimatedSavings: number;
};

type VendorAccumulator = {
  vendor: string;
  issues: Set<string>;
  confidence: "high" | "medium" | "low";

  inactiveSavings: number;
  duplicateSavings: number;
  overpayingSavings: number;
};

type FormattedVendor = {
  vendor: string;
  issues: string[];
  potentialSavings: number;
  confidence: "high" | "medium" | "low";
};

type FormattedResult = {
  vendors: FormattedVendor[];
  totalSavings: number;
};

export function formatInsights(insights: Insight[]): FormattedResult {
  const vendorMap: Record<string, VendorAccumulator> = {};

  const priority: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  // ----------- Aggregate raw signals -----------
  for (const insight of insights) {
    const key = insight.vendor.toLowerCase();

    if (!vendorMap[key]) {
      vendorMap[key] = {
        vendor: insight.vendor,
        issues: new Set(),
        confidence: "low",
        inactiveSavings: 0,
        duplicateSavings: 0,
        overpayingSavings: 0,
      };
    }

    const entry = vendorMap[key];

    entry.issues.add(insight.type);

    // Track savings separately (CRITICAL)
    if (insight.type === "inactive") {
      entry.inactiveSavings += insight.estimatedSavings;
    }

    if (insight.type === "duplicate") {
      // take max once (engine already computed full duplicate savings)
      entry.duplicateSavings = Math.max(
        entry.duplicateSavings,
        insight.estimatedSavings
      );
    }

    if (insight.type === "overpaying") {
      entry.overpayingSavings = Math.max(
        entry.overpayingSavings,
        insight.estimatedSavings
      );
    }

    // Confidence resolution (highest wins)
    if (priority[insight.confidence] > priority[entry.confidence]) {
      entry.confidence = insight.confidence;
    }
  }

  // ----------- Resolve final vendor output -----------
  const vendors: FormattedVendor[] = [];

  for (const key in vendorMap) {
    const v = vendorMap[key];

    let potentialSavings = 0;

    // RULE: duplicate overrides inactive (prevents double counting)
    if (v.duplicateSavings > 0) {
      potentialSavings = v.duplicateSavings;
    } else {
      potentialSavings = v.inactiveSavings + v.overpayingSavings;
    }

    vendors.push({
      vendor: v.vendor,
      issues: Array.from(v.issues),
      potentialSavings,
      confidence: v.confidence,
    });
  }

  // ----------- Total savings -----------
  const totalSavings = vendors.reduce(
    (sum, v) => sum + v.potentialSavings,
    0
  );

  return {
    vendors,
    totalSavings,
  };
}