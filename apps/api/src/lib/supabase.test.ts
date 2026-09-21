import assert from "node:assert/strict";
import { test } from "node:test";
import { createSupabaseClient } from "./supabase.js";

const variableNames = [
  "SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEYS", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEYS",
] as const;

test("Supabase backend credentials", async (t) => {
  const saved = Object.fromEntries(variableNames.map((name) => [name, process.env[name]]));
  t.after(() => {
    for (const name of variableNames) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });
  for (const name of variableNames) delete process.env[name];
  process.env.SUPABASE_URL = "https://example.supabase.co";

  assert.throws(createSupabaseClient, /SUPABASE_SECRET_KEY/);
  for (const key of ["sb_publishable_test", "sb_secret_hidden••••", "sb_secret_hidden..."]) {
    process.env.SUPABASE_SECRET_KEY = key;
    assert.throws(createSupabaseClient, /full Supabase secret key/);
  }

  for (const variable of ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const) {
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const key = variable === "SUPABASE_SECRET_KEY" ? "sb_secret_local_test_only" : "legacy-test-key";
    process.env[variable] = key;
    let calls = 0;
    const fetchMock = t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
      calls += 1;
      assert.match(String(input), /^https:\/\/example\.supabase\.co\/rest\/v1\/cards/);
      assert.equal(new Headers(init?.headers).get("apikey"), key);
      return new Response("[]", { headers: { "Content-Type": "application/json" } });
    });
    const result = await createSupabaseClient().from("cards").select("id").limit(0);
    assert.equal(result.error, null);
    assert.deepEqual(result.data, []);
    assert.equal(calls, 1);
    fetchMock.mock.restore();
  }
});