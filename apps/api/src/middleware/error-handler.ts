import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : "unknown error";
  console.error(err);
  res.status(500).json({ error: message });
};
