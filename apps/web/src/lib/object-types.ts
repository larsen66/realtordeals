export const objectTypes = ["Квартира", "Дом", "Участок"];

export function normalizeObjectType(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return objectTypes.find((type) => type.toLocaleLowerCase("ru") === trimmed.toLocaleLowerCase("ru")) ?? trimmed;
}
