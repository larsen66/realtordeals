import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

function equalSecret(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function requireBearerToken(envName: string): RequestHandler {
  return (req, res, next) => {
    const token = process.env[envName]?.trim();
    if (!token) {
      res.status(503).json({ error: "service authentication is not configured" });
      return;
    }

    const authorization = req.header("authorization") ?? "";
    if (!equalSecret(authorization, `Bearer ${token}`)) {
      res.status(401).json({ error: "access denied" });
      return;
    }

    next();
  };
}
