import { Insight } from "./insight.engine";

export function calculateTotalSavings(insights: Insight[]): number {
  return insights.reduce((sum, i) => sum + i.estimatedSavings, 0);
}