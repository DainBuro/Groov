export function formatPosition(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
}
