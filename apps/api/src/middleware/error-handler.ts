import type { ErrorRequestHandler } from "express";
import { CardValidationError, PersistCardError } from "@rieltordeals/domain";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof PersistCardError || err instanceof CardValidationError) {
    res.status(400).json({
      error: err.message,
      issues: err instanceof CardValidationError ? err.issues : err.issues,
    });
    return;
  }

  const message = err instanceof Error ? err.message : "unknown error";
  console.error(err);
  res.status(500).json({ error: message });
};
