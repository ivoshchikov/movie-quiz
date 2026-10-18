// Unicode 17 control/format, line/paragraph separators, default-ignorable
// code points, plus Ogham/Braille blanks. Keep identical to valid_nickname in SQL.
const hiddenRanges: readonly (readonly [number, number])[] = [
  [0, 31],
  [127, 159],
  [173, 173],
  [847, 847],
  [1536, 1541],
  [1564, 1564],
  [1757, 1757],
  [1807, 1807],
  [2192, 2193],
  [2274, 2274],
  [4447, 4448],
  [5760, 5760],
  [6068, 6069],
  [6155, 6159],
  [8203, 8207],
  [8232, 8238],
  [8288, 8303],
  [10240, 10240],
  [12644, 12644],
  [65024, 65039],
  [65279, 65279],
  [65440, 65440],
  [65520, 65531],
  [69821, 69821],
  [69837, 69837],
  [78896, 78911],
  [113824, 113827],
  [119155, 119162],
  [917504, 921599],
];
export function normalizeNickname(value: string) {
  return value.normalize("NFKC").trim().replace(/ +/g, " ");
}
export function nicknameProblem(value: string): string | null {
  const chars = Array.from(value);
  if (chars.length < 3) return "Use at least 3 characters.";
  if (chars.length > 20) return "Use no more than 20 characters.";
  if (chars.some(char => {
    const code = char.codePointAt(0)!;
    return hiddenRanges.some(([start, end]) => code >= start && code <= end);
  })) return "Use visible characters only. Invisible and control characters are not allowed.";
  return null;
}
