# SaaScope API - Case Study Outline

## Project Overview

### What is SaaScope?

SaaScope is a SaaS spend visibility and optimization platform designed to help organizations identify wasted subscription spending.

The MVP allows users to upload SaaS subscription data via CSV and receive actionable insights about:

* Duplicate subscriptions
* Inactive software
* Potential cost savings
* Vendor-level recommendations

---

## Problem

### Observation

Many startups and growing companies accumulate SaaS subscriptions over time.

Common issues include:

* Duplicate tools performing the same function
* Inactive subscriptions that are still being paid for
* Forgotten software renewals
* Lack of visibility into SaaS spending

### Challenge

Most solutions require deep integrations with multiple providers.

For an MVP, integration complexity would slow validation significantly.

### Hypothesis

If users can upload subscription data through CSV, meaningful optimization opportunities can be identified without building dozens of integrations.

---

## MVP Scope

### Included

* Authentication
* CSV Upload
* Insight Generation
* Report Persistence
* Search
* Filtering
* Pagination
* Report Ownership
* Failure Recovery
* Retry Workflow
* Event History
* Dashboard Summary Analytics

### Excluded

* Stripe Integration
* QuickBooks Integration
* SaaS Vendor APIs
* Background Jobs
* Notifications
* Team Collaboration
* Billing
* Duplicate Upload Detection

### Reasoning

The goal was validation, not scale.

---

## System Architecture

### High-Level Flow

User
↓
Authenticate
↓
Upload CSV
↓
CSV Parsing
↓
Insight Engine
↓
Report Generation
↓
Persistence Layer
↓
Dashboard Analytics

### Core Components

* Authentication Layer
* Upload Pipeline
* CSV Parser
* Insight Engine
* Report Service
* Event History Service
* Dashboard Analytics Service
* PostgreSQL Database

---

## Major Technical Decisions

### Decision 1

Start with CSV uploads instead of SaaS integrations.

#### Why?

* Faster MVP
* Lower complexity
* Easier testing
* Faster user feedback

#### Tradeoff

Manual uploads instead of automated data collection.

---

### Decision 2

Persist reports in PostgreSQL.

#### Why?

* Historical analysis
* User report history
* Ownership enforcement

#### Tradeoff

Additional database complexity.

---

### Decision 3

Extract processing into a shared processReport() service.

#### Why?

Both Upload and Retry workflows required identical processing logic.

#### Result

Single source of truth for report processing.

---

### Decision 4

Implement Event History instead of relying only on status fields.

#### Why?

Status shows current state.

Events show the complete workflow history.

#### Result

Improved observability and debugging.

---

## Major Challenges

### Authentication and Ownership

Challenge:
Ensuring users could only access their own reports.

Solution:
JWT authentication and ownership-based queries.

---

### Retry Workflow

Challenge:
Recovering failed processing attempts.

Solution:
Introduced report states and retry endpoints.

---

### Event Tracking

Challenge:
Understanding how reports moved between states.

Solution:
Created report_events table and event history tracking.

---

### Query Validation

Challenge:
Invalid filter values produced incorrect results.

Example:

GET /reports?minSavings=-999999

Solution:
Input validation and defensive checks.

---

## Features Implemented

### Authentication

* Register
* Login
* JWT Middleware

### Report Management

* Upload Reports
* Retrieve Reports
* List Reports
* Ownership Enforcement

### Report Discovery

* Pagination
* Search
* Filtering

### Workflow Management

* Status Tracking
* Failure Recovery
* Retry Processing

### Observability

* Structured Logging
* Request IDs
* Event History

### Analytics

* Dashboard Summary Endpoint

---

## Lessons Learned

### Product Lessons

* Validation matters more than integrations.
* Simpler workflows accelerate learning.
* Not every feature belongs in the MVP.

### Engineering Lessons

* Shared services reduce duplicate logic.
* Event history is more valuable than status alone.
* Failure paths deserve the same attention as success paths.

### Scope Lessons

Several ideas were intentionally postponed:

* Duplicate upload detection
* External integrations
* Background processing

Reason:

Focus on solving one problem well.

---

## Current Status

### Backend

Complete MVP backend implemented.

Includes:

* Authentication
* Upload Pipeline
* Report Processing
* Event History
* Dashboard Analytics

### Frontend

Next phase:

Build SaaScope dashboard using Next.js.

Planned screens:

* Login
* Dashboard
* Upload Flow
* Reports Table
* Report Details
* Event Timeline

---

## Future Roadmap

### Near Term

* Frontend Dashboard
* Improved Report Detail Experience
* Event Metadata
* Duplicate Upload Detection

### Mid Term

* SaaS Integrations
* Automated Imports
* Team Workspaces

### Long Term

* Continuous Spend Monitoring
* AI Recommendations
* Enterprise Reporting

---

## Key Takeaway

The project evolved from a simple CSV upload tool into a workflow-driven SaaS spend analysis platform.

The most important lesson was that building a product is less about adding features and more about making deliberate tradeoffs that maximize learning and validation.
