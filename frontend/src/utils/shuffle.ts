// frontend/src/utils/shuffle.ts
/**
 * Перемешивает массив алгоритмом Фишера-Йетса (Durstenfeld).
 * Возвращается **новый** массив, исходный не изменяется.
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];                    // копия
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];        // swap
  }
  return a;
}
