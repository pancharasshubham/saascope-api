# Event History

## Problem

A report status only showed the current state.

Example:

completed

This did not explain how the report reached that state.

## Solution

Created a report_events table.

Added event tracking for:

* report_created
* processing_started
* processing_failed
* retry_started
* processing_completed

## Alternative Considered

Store only status in reports table.

Rejected because workflow history would be lost.

## Bugs Encountered

* processing_completed event was not recorded
* old reports showed empty event arrays
* retry failures required event tracking

## Result

Reports now expose a complete processing timeline.
