export function normalizeNickname(value: string) {
  return value.normalize("NFKC").trim().replace(/ +/g, " ");
}
export function nicknameProblem(value: string): string | null {
  const chars = Array.from(value);
  if (chars.length < 3) return "Use at least 3 characters.";
  if (chars.length > 20) return "Use no more than 20 characters.";
  for (const char of chars) {
    const c = char.codePointAt(0)!;
    if (c < 32 || c >= 127 && c <= 159 || [173, 847, 1564, 4447, 4448, 12644, 65279, 65440].includes(c) ||
      c >= 6068 && c <= 6069 || c >= 6155 && c <= 6159 || c >= 8203 && c <= 8207 ||
      c >= 8232 && c <= 8238 || c >= 8288 && c <= 8303 || c >= 65024 && c <= 65039 ||
      c >= 113824 && c <= 113827 || c >= 119155 && c <= 119162 || c >= 917504 && c <= 921599) {
      return "Use visible characters only. Invisible and control characters are not allowed.";
    }
  }
  return null;
}
