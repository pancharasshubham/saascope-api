import fs from "fs";
import { parse } from "csv-parse";

type SaaSRecord = {
  vendorName: string;
  cost: number;
  seats: number;
  billingCycle: "monthly" | "annual";
  lastUsedDate?: string;
};

type ParseResult = {
  valid: SaaSRecord[];
  errors: { row: number; reason: string }[];
};

export const parseCSV = (filePath: string): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const valid: SaaSRecord[] = [];
    const errors: { row: number; reason: string }[] = [];

    let rowNumber = 1;

    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true }))
      .on("data", (row) => {
        rowNumber++;

        const validation = validateRow(row);

        if (validation.valid) {
          valid.push(validation.record!);
        } else {
          errors.push({ row: rowNumber, reason: validation.reason! });
        }
      })
      .on("end", () => {
        resolve({ valid, errors });
      })
      .on("error", reject);
  });
};

function validateRow(row: any): {
  valid: boolean;
  record?: SaaSRecord;
  reason?: string;
} {
  const vendorName = row.vendorName?.trim();
  const cost = Number(row.cost);
  const seats = Number(row.seats);
  const billingCycle = row.billingCycle?.toLowerCase();
  const lastUsedDate = row.lastUsedDate;

  if (!vendorName) return { valid: false, reason: "missing vendorName" };
  if (isNaN(cost) || cost <= 0)
    return { valid: false, reason: "invalid cost" };
  if (!Number.isInteger(seats) || seats < 1)
    return { valid: false, reason: "invalid seats" };
  if (!["monthly", "annual"].includes(billingCycle))
    return { valid: false, reason: "invalid billingCycle" };

  if (lastUsedDate && isNaN(Date.parse(lastUsedDate)))
    return { valid: false, reason: "invalid lastUsedDate" };

  return {
    valid: true,
    record: {
      vendorName,
      cost,
      seats,
      billingCycle,
      lastUsedDate,
    },
  };
}