import { Router } from "express";

export const cardsRouter = Router();

cardsRouter.get("/", (_req, res) => {
  res.status(501).json({ error: "not implemented" });
});
