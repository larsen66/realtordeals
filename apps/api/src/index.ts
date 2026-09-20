import "./lib/load-env.js";
import { app } from "./app.js";

const port = Number(process.env.PORT) || 3001;

export default app;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`api listening on ${port}`);
  });
}
