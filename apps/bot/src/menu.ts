import type { Bot } from "grammy";

export const commands = [
  { command: "buyer", description: "Покупатель" },
  { command: "seller", description: "Продавец" },
  { command: "edit", description: "Клиент CRM" },
  { command: "draft", description: "Черновик" },
  { command: "usage", description: "Расходы" },
  { command: "help", description: "Помощь" },
];

export async function registerMenu(bot: Bot) {
  await bot.api.setMyCommands(commands);
  await bot.api.setChatMenuButton({ menu_button: { type: "commands" } });
}
