import { harness, actor } from "../test/harness.js";
import { DemoCrmGateway } from "../src/gateways/demo.js";

const gateway = new DemoCrmGateway();
const app = harness(gateway);
try {
  await app.text("/start");
  await app.click("new:buyer");
  await app.text("Имя: Учебный клиент\nБюджет: 5 млн");
  await app.text("Телефон: +7 000 000-00-00");
  const old = (await gateway.current(actor))!;
  await app.click(`fix:${old.id}:${old.revision}`);
  await app.text("Бюджет: 6 млн");
  const final = (await gateway.current(actor))!;
  await app.click(`ok:${final.id}:${final.revision}`);
  for (const message of app.sent.filter((s) => s.method === "sendMessage")) {
    console.log(message.text);
    if (message.reply_markup) console.log(message.reply_markup.inline_keyboard.flat().map((b) => `[${b.text}]`).join(" "));
    console.log();
  }
} finally { app.close(); }
