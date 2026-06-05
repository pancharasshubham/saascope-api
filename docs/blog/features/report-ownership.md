# Report Ownership

## Problem

Reports were globally visible to all users, creating security and data isolation issues.

## Solution

Implemented tenant-based report ownership model.

Added ownership controls for:

* User-scoped report access
* Tenant isolation enforcement
* Ownership validation on all operations
* Cross-user data separation

## Alternative Considered

Role-based access without ownership validation.

Rejected because it allowed data leakage between users in shared roles.

## Bugs Encountered

* Ownership checks missing from update operations
* Reports accessible via direct ID enumeration
* Tenant context not enforced in queries
* Cascade delete broke report relationships

## Result

Reports are now properly isolated per user/tenant with enforced ownership validation.
