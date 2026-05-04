export type BillingCycle = "monthly" | "annual";
export type InsightType = "inactive" | "duplicate" | "overpaying";
export type Confidence = "high" | "medium" | "low";

export type SaaSRecord = {
  vendorName: string;
  cost: number;
  seats: number;
  billingCycle: BillingCycle;
  lastUsedDate?: string;
};

export type Insight = {
  type: InsightType;
  vendor: string;
  reason: string;
  confidence: Confidence;
  estimatedSavings: number;
};

export type InsightConfig = {
  inactiveThresholdDays: number;
  duplicateCostMinimum: number;
};

export type FormattedVendor = {
  vendor: string;
  issues: InsightType[];
  potentialSavings: number;
  confidence: Confidence;
  recommendedAction: string;
};

export type FormattedResult = {
  vendors: FormattedVendor[];
  totalSavings: number;
};