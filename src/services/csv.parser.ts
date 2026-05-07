import fs from "fs";
import { parse } from "csv-parse";

import { SaaSRecord } from "../models/types";
import { REQUIRED_HEADERS } from "../constants/csv";
import { validateHeaders } from "../utils/validateHeaders";

type ParseError = {
  row: number;
  reason: string;
};

type ParseResult = {
  valid: SaaSRecord[];
  errors: ParseError[];
};

export async function parseCSV(
  filePath: string
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const valid: SaaSRecord[] = [];
    const errors: ParseError[] = [];

    let rowNumber = 1;
    let headersValidated = false;

    const parser = parse({
      columns: true,
      trim: true,
      skip_empty_lines: true,
    });

    parser.on("readable", () => {
      let record;

      while ((record = parser.read()) !== null) {
        rowNumber++;

        // ---------- Header Validation ----------
        if (!headersValidated) {
          const headers = Object.keys(record);

          const validation = validateHeaders(
            headers,
            REQUIRED_HEADERS
          );

          if (!validation.valid) {
            reject({
              type: "INVALID_HEADERS",
              missing: validation.missing,
            });

            return;
          }

          headersValidated = true;
        }

        // ---------- Row Parsing ----------
        const vendorName = record.vendorName?.trim();

        const cost = Number(record.cost);

        const seats = Number(record.seats);

        const billingCycle =
          record.billingCycle?.trim();

        const lastUsedDate =
          record.lastUsedDate?.trim() || undefined;

        // ---------- Validation ----------
        if (!vendorName) {
          errors.push({
            row: rowNumber,
            reason: "missing vendorName",
          });

          continue;
        }

        if (Number.isNaN(cost) || cost < 0) {
          errors.push({
            row: rowNumber,
            reason: "invalid cost",
          });

          continue;
        }

        if (
          Number.isNaN(seats) ||
          !Number.isInteger(seats) ||
          seats < 1
        ) {
          errors.push({
            row: rowNumber,
            reason: "invalid seats",
          });

          continue;
        }

        if (
          billingCycle !== "monthly" &&
          billingCycle !== "annual"
        ) {
          errors.push({
            row: rowNumber,
            reason: "invalid billingCycle",
          });

          continue;
        }

        if (
          lastUsedDate &&
          Number.isNaN(Date.parse(lastUsedDate))
        ) {
          errors.push({
            row: rowNumber,
            reason: "invalid lastUsedDate",
          });

          continue;
        }

        // ---------- Valid Record ----------
        valid.push({
          vendorName,
          cost,
          seats,
          billingCycle,
          lastUsedDate,
        });
      }
    });

    parser.on("error", (err) => {
      reject(err);
    });

    parser.on("end", () => {
      resolve({
        valid,
        errors,
      });
    });

    fs.createReadStream(filePath).pipe(parser);
  });
}