# QA & Coding Standards

This document establishes the quality assurance protocols for the "Family Trip 2026" flight data pipeline. All future code modifications should adhere to these standards.

## 1. API Integration Stability
*   **Response Schema Validation**: Do not assume API responses always have the expected fields.
    *   *Rule*: Use optional chaining (`?.`) or explicit guards when accessing nested properties (e.g., `response.data?.itineraries?.[0]`).
    *   *Why*: APIs change, and error responses often have different shapes.
*   **Rate Limit & Quota Handling**:
    *   *Rule*: Handle `429 Too Many Requests` gracefully.
    *   *Why*: To prevent crashing or getting banned.
*   **Error Granularity**:
    *   *Rule*: Do not swallow errors. Log them with context and bubble up critical failures to the UI.

## 2. Business Logic & Data Validity
*   **Date Logic Constraints**:
    *   *Rule*: Validate dates *before* calling APIs.
        *   Departure cannot be in the past.
        *   Return date must be after departure date.
    *   *Why*: Prevents wasted API credits on invalid queries.
*   **Route Logic**:
    *   *Rule*: Origin and Destination must be different.
    *   *Why*: Basic sanity check.
*   **Data formatting**:
    *   *Rule*: Normalize data (prices, dates) to a common format before storage.

## 3. System & Configuration
*   **Startup Health Check**:
    *   *Rule*: The application must refuse to start if required environment variables (API keys, Sheet IDs) are missing.
    *   *Why*: Fails fast during deployment rather than failing silently during user interaction.
*   **File Path Safety**:
    *   *Rule*: Use `path.join(__dirname, ...)` for all local file access.
    *   *Why*: Ensures reliability regardless of the working directory.

## 4. Code Quality & Cleanliness
*   **Dead Code**:
    *   *Rule*: Remove commented-out code blocks and unused files.
    *   *Why*: Reduces confusion for future maintainers (human or AI).
*   **Console Log Noise**:
    *   *Rule*: Keep production logs clean. Use debug flags if verbose logging is needed.
