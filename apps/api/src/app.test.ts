import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, test } from "node:test";
import { app } from "./app.js";

const server = app.listen(0);
await new Promise<void>((resolve) => {
  server.once("listening", () => resolve());
});

test("GET /health returns { ok: true }", async () => {
  const { port } = server.address() as AddressInfo;
  const res = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

after(() => {
  server.close();
});
