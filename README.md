# saascope-api

> Backend API for SaaS spend visibility — upload your software subscriptions, get actionable cost optimization insights.

---

## What It Does

Organizations accumulate wasteful SaaS spend through inactive licenses, forgotten trial conversions, and redundant tools bought across departments. `saascope-api` accepts CSV exports of software subscriptions and returns structured insights categorized by type, confidence level, and estimated savings — without requiring integrations, OAuth flows, or vendor access.

**Current insight types:**

| Type | Signal | Confidence |
|---|---|---|
| `inactive` | License unused for 90+ days | High |
| `duplicate` | Multiple subscriptions to same vendor | Medium |
| `overpaying` | Multi-seat license with no usage data | Low |

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js + TypeScript | Type safety on input parsing matters here |
| Framework | Express | No abstraction overhead at MVP scale |
| Database | PostgreSQL | Relational data, reliable, production-grade |
| Auth | JWT (stateless) | Simple, no session management needed |
| Hosting | Render | Free tier, straightforward Postgres addon |

---

## Project Structure

```
src/
├── controllers/          # HTTP layer only — no business logic
├── services/
│   ├── csv.parser.ts     # Parse + validate CSV rows
│   ├── insight.engine.ts # Pure function: SaaSRecord[] → Insight[]
│   └── savings.aggregator.ts  # Aggregate estimatedSavings across insights
├── models/               # TypeScript types + DB schema definitions
├── routes/               # Route registration
├── middlewares/          # Auth, error handling, rate limiting
├── config/               # Env config loader
└── utils/                # Shared helpers
```

**Architectural constraint:** `insight.engine.ts` is a pure function. It takes records and config. It returns insights. It makes zero database calls, reads no environment variables, and performs no I/O. If this boundary breaks, the engine becomes untestable.

---

## Data Model

```
User
  id, email, passwordHash, createdAt

Upload
  id, userId, fileName, uploadedAt
  totalRows, processedRows, skippedRows   ← persisted, not just returned in response

UploadError
  id, uploadId, rowNumber, reason, rawData

SaaSRecord
  id, userId, vendorName, costMonthly, seats
  billingCycle ["monthly" | "annual"]
  lastUsedDate (nullable — user-provided, no inference)
  createdAt

Insight
  id, userId, saasRecordId
  type ["inactive" | "duplicate" | "overpaying"]
  confidence ["high" | "medium" | "low"]
  description, estimatedSavings
  createdAt
```

**Note on cost:** All costs are normalized to monthly on ingest. `costMonthly` is the stored field. Savings figures are always monthly.

---

## Insight Engine Logic

Rules are deterministic. Confidence is always explicit. The engine never implies certainty when data is incomplete.

```
INACTIVE
  Condition : lastUsedDate EXISTS AND is older than INACTIVE_THRESHOLD_DAYS
  Savings   : costMonthly
  Confidence: high
  Skipped if: lastUsedDate is null → classified as "unknown usage", not inactive

DUPLICATE
  Condition : normalized vendorName appears more than once under same userId
  Normalization: lowercase + trim + remove [inc, llc, ltd, corp]
  Savings   : sum of group costs minus cheapest record in group
  Confidence: medium

OVERPAYING
  Condition : seats > 1 AND lastUsedDate IS NULL AND costMonthly > 0
  Savings   : costMonthly * (seats - 1) / seats
  Confidence: low
  Interpretation: flags paid multi-seat licenses with zero usage visibility
```

---

## API

### `POST /api/v1/upload`

Upload a CSV file of SaaS subscriptions.

**Required CSV columns:**

| Column | Type | Rules |
|---|---|---|
| `vendorName` | string | Required, non-empty |
| `cost` | number | Required, > 0 |
| `seats` | integer | Required, >= 1 |
| `billingCycle` | string | `monthly` or `annual` (case-insensitive) |
| `lastUsedDate` | date | Optional, ISO 8601 if present |

**Response:**

```json
{
  "upload": {
    "id": "uuid",
    "totalRows": 50,
    "processedRows": 44,
    "skippedRows": 6,
    "errors": [
      { "row": 3, "reason": "cost must be greater than 0" },
      { "row": 17, "reason": "billingCycle must be 'monthly' or 'annual'" }
    ]
  },
  "insights": [
    {
      "type": "inactive",
      "confidence": "high",
      "vendorName": "Notion",
      "description": "No usage detected in the last 90 days",
      "estimatedMonthlySavings": 48.00
    }
  ],
  "summary": {
    "insightsFound": 7,
    "totalEstimatedMonthlySavings": 312.50,
    "message": null
  }
}
```

If no insights are found, `insights` returns an empty array and `summary.message` explains why (typically missing `lastUsedDate` data).

---

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/saascope

# Auth
JWT_SECRET=                   # min 32 characters, generate with: openssl rand -hex 32
JWT_EXPIRES_IN=7d

# File Upload
MAX_FILE_SIZE_MB=10
UPLOAD_TEMP_DIR=./tmp/uploads

# Insight Thresholds
INACTIVE_THRESHOLD_DAYS=90
DUPLICATE_COST_MINIMUM=0
```

---

## Local Setup

```bash
git clone https://github.com/your-username/saascope-api.git
cd saascope-api

npm install

cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET

# Run migrations
npm run migrate

# Start dev server
npm run dev
```

**Requirements:** Node.js 18+, PostgreSQL 14+

---

## Development Constraints

These are active decisions, not TODO items:

- **No Redis.** Rate limiting is in-memory. Redis gets added when there is a second server instance.
- **No S3.** Files are processed in memory and discarded. Upload summaries persist to DB; raw files do not.
- **No OAuth.** JWT only. OAuth is a scope decision, not a technical one.
- **No real usage tracking.** `lastUsedDate` is user-provided. The engine does not infer usage from integrations.
- **Designed for 10–50 users.** Scale is not a current constraint. Premature optimization is.

---

## What's Not Built Yet

- Frontend / dashboard
- Sentry error tracking
- Email alerts for upcoming renewals
- Integration with accounting tools (Ramp, Brex, QuickBooks)
- Per-department breakdowns

---

## License

MIT
