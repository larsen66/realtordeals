import type { ErrorRequestHandler } from "express";
import { CardValidationError, PersistCardError } from "@rieltordeals/domain";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(JSON.stringify({
    time: new Date().toISOString(), service: "api", event: "request.error",
    requestId: res.locals.requestId,
    category: err instanceof CardValidationError ? "validation" : err instanceof PersistCardError ? "persistence" : "internal",
    // Stack frames only: error messages may contain customer data or credentials.
    frames: err instanceof Error ? err.stack?.split("\n").slice(1, 7).filter(line => /^\s+at /.test(line)) : [],
  }));
  if (err instanceof PersistCardError || err instanceof CardValidationError) {
    res.status(400).json({
      error: err.message,
      issues: err instanceof CardValidationError ? err.issues : err.issues,
    });
    return;
  }

  const message = err instanceof Error ? err.message : "unknown error";
  res.status(500).json({ error: message });
};
