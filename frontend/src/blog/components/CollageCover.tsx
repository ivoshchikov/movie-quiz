// src/blog/components/CollageCover.tsx
import React from "react";

type Props = {
  images: string[];
  /** Сколько максимум картинок использовать (фактически: 8 → 4 → 2 → 1). */
  max?: number;
  /** Дополнительные классы-обёртки */
  className?: string;
  /** Вариант оформления: 'default' = рамка+скругления; 'plain' = чистый блок (для карточек) */
  variant?: "default" | "plain";
};

/**
 * Рендерит коллаж из 1/2/4/8 изображений без повторов:
 * - 8+ → 4x2
 * - 4–7 → 2x2
 * - 2–3 → 2x1
 * - 1   → 1x1
 * Если массив пуст — вернёт градиент-заглушку.
 */
export default function CollageCover({
  images,
  max = 8,
  className,
  variant = "default",
}: Props) {
  const uniq = Array.from(new Set((images || []).filter(Boolean)));
  let subset: string[] = [];
  let cols = 4;
  let rows = 2;

  if (uniq.length >= 8 && max >= 8) {
    subset = uniq.slice(0, 8);
    cols = 4;
    rows = 2;
  } else if (uniq.length >= 4) {
    subset = uniq.slice(0, Math.min(4, max));
    cols = 2;
    rows = 2;
  } else if (uniq.length >= 2) {
    subset = uniq.slice(0, Math.min(2, max));
    cols = 2;
    rows = 1;
  } else if (uniq.length === 1) {
    subset = uniq.slice(0, 1);
    cols = 1;
    rows = 1;
  }

  const frame =
    variant === "default" ? "rounded-2xl border border-white/10" : "";

  if (subset.length === 0) {
    return (
      <div
        className={[
          "relative aspect-video w-full overflow-hidden",
          frame,
          className || "",
        ].join(" ")}
      >
        <div className="h-full w-full bg-gradient-to-br from-indigo-900/50 to-purple-900/40" />
      </div>
    );
  }

  return (
    <div
      className={[
        "relative aspect-video w-full overflow-hidden",
        frame,
        className || "",
      ].join(" ")}
    >
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {subset.map((url, i) => (
          <div
            key={i}
            className="bg-cover bg-center"
            style={{ backgroundImage: `url('${url}')` }}
          />
        ))}
      </div>

      {/* Мягкий градиент для читабельности любых поверхностных элементов */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
    </div>
  );
}
