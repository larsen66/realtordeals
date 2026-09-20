import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { errorHandler } from "./middleware/error-handler.js";
import { requireBearerToken } from "./middleware/bearer-auth.js";
import { cardsRouter } from "./routes/cards.js";
import { botRouter } from "./routes/bot.js";
import { filesRouter } from "./routes/files.js";
import { healthRouter } from "./routes/health.js";
import { leadsRouter } from "./routes/leads.js";
import { statusesRouter } from "./routes/statuses.js";

export const app = express();

app.use(cors());
app.use((req, res, next) => {
  const started = Date.now();
  const incoming = req.header("x-request-id");
  const requestId = incoming && /^[a-f0-9-]{36}$/.test(incoming) ? incoming : randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  const log = (event: string) => console.log(JSON.stringify({
    time: new Date().toISOString(), service: "api", event, requestId,
    method: req.method, route: req.route?.path ? `${req.baseUrl}${req.route.path}` : "unmatched",
    status: res.statusCode, durationMs: Date.now() - started,
  }));
  log("request.start");
  res.on("finish", () => log("request.finish"));
  res.on("close", () => { if (!res.writableFinished) log("request.aborted"); });
  next();
});
app.use(express.json());

app.use("/health", healthRouter);
app.use(["/cards", "/statuses", "/files"], requireBearerToken("CRM_API_TOKEN"));
app.use("/cards", cardsRouter);
app.use("/leads", leadsRouter);
app.use("/statuses", statusesRouter);
app.use("/files", filesRouter);
app.use("/bot/v1", botRouter);

app.use(errorHandler);

export default app;
