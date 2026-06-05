# SaaScope Project Origin

## Problem

Many startups pay for SaaS subscriptions they no longer use.

Examples:

* Duplicate subscriptions
* Inactive users
* Forgotten tools
* Unused licenses

Most teams do not discover the waste until renewal time.

## Initial Hypothesis

If a company uploads subscription data in CSV format, it should be possible to identify optimization opportunities automatically.

## MVP Decision

Instead of building integrations with Stripe, QuickBooks, Google Workspace, Slack, and dozens of SaaS vendors, start with a simple CSV upload workflow.

Reason:

* Faster validation
* Lower engineering complexity
* Faster feedback loop

## Success Criteria

A user uploads a CSV and receives:

* Potential savings
* Vendor insights
* Recommended actions

without requiring any external integrations.
