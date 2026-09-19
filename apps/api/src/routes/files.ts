import { Router } from "express";

export const filesRouter = Router();

filesRouter.post("/", (_req, res) => {
  res.status(501).json({ error: "not implemented" });
});
