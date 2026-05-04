import {
  Insight,
  InsightType,
  Confidence,
  FormattedResult,
  FormattedVendor,
} from "../models/types";

// internal only — DO NOT export
type VendorAggregation = {
  vendor: string;
  issues: Set<InsightType>;
  confidence: Confidence;

  inactiveSavings: number;
  duplicateSavings: number;
  overpayingSavings: number;
};

// type-safe priority
const CONFIDENCE_PRIORITY = {
  high: 3,
  medium: 2,
  low: 1,
} as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// action mapping (product layer)
function getRecommendedAction(issues: Set<InsightType>): string {
  if (issues.has("duplicate")) {
    return "Cancel duplicate subscriptions and keep one active plan";
  }

  if (issues.has("inactive")) {
    return "Cancel unused subscription";
  }

  if (issues.has("overpaying")) {
    return "Reduce seats or review actual usage";
  }

  return "No action required";
}

function normalizeVendor(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|technologies)\b/g, "")
    .trim();
}

export function formatInsights(insights: Insight[]): FormattedResult {
  const vendorMap: Record<string, VendorAggregation> = {};

  // ----------- Aggregate raw signals -----------
  for (const insight of insights) {
    const key = normalizeVendor(insight.vendor);

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

    // separate buckets (critical)
    if (insight.type === "inactive") {
      entry.inactiveSavings += insight.estimatedSavings;
    }

    if (insight.type === "duplicate") {
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

    // confidence resolution
    if (
      CONFIDENCE_PRIORITY[insight.confidence] >
      CONFIDENCE_PRIORITY[entry.confidence]
    ) {
      entry.confidence = insight.confidence;
    }
  }

  // ----------- Final vendor-level resolution -----------
  const vendors: FormattedVendor[] = [];

  for (const key in vendorMap) {
    const v = vendorMap[key];

    let potentialSavings = 0;

    // duplicate overrides inactive (prevents double counting)
    if (v.duplicateSavings > 0) {
      potentialSavings = v.duplicateSavings;
    } else {
      potentialSavings =
        v.inactiveSavings + v.overpayingSavings;
    }

    vendors.push({
      vendor: v.vendor,
      issues: Array.from(v.issues), // now type-safe
      potentialSavings: round2(potentialSavings),
      confidence: v.confidence,
      recommendedAction: getRecommendedAction(v.issues),
    });
  }

  const totalSavings = round2(vendors.reduce(
    (sum, v) => sum + v.potentialSavings,
    0)
  );

  return {
    vendors,
    totalSavings,
  };
}