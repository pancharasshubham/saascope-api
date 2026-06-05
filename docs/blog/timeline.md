# SaaScope Timeline

## Phase 1

Project idea validation

Decision:
Start with CSV uploads instead of SaaS integrations.

Reason:
Faster MVP.

---

## Phase 2

Authentication

Implemented:

* Register
* Login
* JWT

---

## Phase 3

Report Persistence

Implemented:

* PostgreSQL storage
* Report retrieval
* Ownership tracking

---

## Phase 4

Pagination and Filtering

Implemented:

* Pagination
* Search
* minSavings filtering

Bug fixed:

* Negative minSavings values accepted.

---

## Phase 5

Failure Recovery

Implemented:

* Processing state
* Failed state
* Retry endpoint

---

## Phase 6

Event History

Implemented:

* report_events table
* Workflow tracking

---

## Phase 7

Dashboard Summary

Implemented:

* Total reports
* Failed reports
* Completed reports
* Total savings
* Average savings
