# Authentication

## Problem

Initially any user could potentially access report endpoints without a mechanism to identify ownership.

This became a problem once reports were persisted in PostgreSQL because report data needed to belong to a specific user.

## Solution

Implemented JWT-based authentication.

Added:

* User registration
* User login
* JWT generation
* Authentication middleware
* User context attached to requests

This allowed report ownership enforcement throughout the API.

## Alternative Considered

Building report functionality before authentication.

Rejected because report ownership would require significant refactoring later.

## Bugs Encountered

* JWT secret typing issues in TypeScript
* req.user typing problems in middleware
* Route handlers failing because user context was unavailable
* Authentication order mistakes causing protected routes to fail

## Result

Every report is now associated with a specific user and protected endpoints require valid authentication.
