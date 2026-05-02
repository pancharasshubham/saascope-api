type Insight = {
  type: "inactive" | "duplicate" | "overpaying";
  vendor: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  estimatedSavings: number;
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
  const vendorMap: Record<string, FormattedVendor> = {};

  for (const insight of insights) {
    const key = insight.vendor.toLowerCase();

    if (!vendorMap[key]) {
      vendorMap[key] = {
        vendor: insight.vendor,
        issues: [],
        potentialSavings: 0,
        confidence: "low",
      };
    }

    const vendorEntry = vendorMap[key];

    // ---- 1. Track unique issues ----
    if (!vendorEntry.issues.includes(insight.type)) {
      vendorEntry.issues.push(insight.type);
    }

    // ---- 2. Deduplicate savings ----
    // RULES:
    // - duplicate → count once per vendor
    // - inactive → sum (each record is separate waste)
    // - overpaying → count once per vendor

    if (insight.type === "inactive") {
      vendorEntry.potentialSavings += insight.estimatedSavings;
    }

    if (insight.type === "duplicate") {
      // only add once
      if (!vendorEntry.issues.includes("duplicate_added")) {
        vendorEntry.potentialSavings += insight.estimatedSavings;
        vendorEntry.issues.push("duplicate_added"); // internal flag
      }
    }

    if (insight.type === "overpaying") {
      if (!vendorEntry.issues.includes("overpaying_added")) {
        vendorEntry.potentialSavings += insight.estimatedSavings;
        vendorEntry.issues.push("overpaying_added"); // internal flag
      }
    }

    // ---- 3. Confidence resolution (priority-based) ----
    const priority: Record<string, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

    if (
      priority[insight.confidence] >
      priority[vendorEntry.confidence]
    ) {
      vendorEntry.confidence = insight.confidence;
    }
  }

  // ---- 4. Clean internal flags ----
  const vendors: FormattedVendor[] = Object.values(vendorMap).map((v) => ({
    vendor: v.vendor,
    issues: v.issues.filter(
      (i) => i !== "duplicate_added" && i !== "overpaying_added"
    ),
    potentialSavings: v.potentialSavings,
    confidence: v.confidence,
  }));

  // ---- 5. Total savings ----
  const totalSavings = vendors.reduce(
    (sum, v) => sum + v.potentialSavings,
    0
  );

  return {
    vendors,
    totalSavings,
  };
}