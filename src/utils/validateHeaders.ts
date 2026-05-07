export function validateHeaders(
  headers: string[],
  requiredHeaders: readonly string[]
) {
  const normalizedHeaders = headers.map((h) =>
    h.trim()
  );

  const missing = requiredHeaders.filter(
    (required) => !normalizedHeaders.includes(required)
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}