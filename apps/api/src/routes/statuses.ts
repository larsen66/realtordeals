import { Router } from "express";

export const statusesRouter = Router();

statusesRouter.get("/", (_req, res) => {
  res.status(501).json({ error: "not implemented" });
});
