import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/error-handler.js";
import { cardsRouter } from "./routes/cards.js";
import { filesRouter } from "./routes/files.js";
import { healthRouter } from "./routes/health.js";
import { leadsRouter } from "./routes/leads.js";
import { statusesRouter } from "./routes/statuses.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.use("/health", healthRouter);
app.use("/cards", cardsRouter);
app.use("/leads", leadsRouter);
app.use("/statuses", statusesRouter);
app.use("/files", filesRouter);

app.use(errorHandler);
