export function normalizeWholeNumberInput(value: string): string {
  return value
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/\D/g, "");
}

export function parseWholeNumberInput(value: string): number {
  const normalized = normalizeWholeNumberInput(value);
  return normalized ? Number(normalized) : 0;
}
