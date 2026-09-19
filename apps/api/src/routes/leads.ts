import { Router } from "express";

export const leadsRouter = Router();

leadsRouter.post("/", (_req, res) => {
  res.status(501).json({ error: "not implemented" });
});
