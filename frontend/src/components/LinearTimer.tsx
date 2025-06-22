import React, { useMemo } from "react";

interface Props {
  seconds: number;  // сколько осталось
  total:   number;  // общее время
}

/** Горизонтальная полоса-таймер: ширина ⬇ по мере убывания времени */
export default function LinearTimer({ seconds, total }: Props) {
  const pct   = useMemo(() => Math.max(0, seconds) / total, [seconds, total]);
  const width = `${pct * 100}%`;

  const color =
    pct > 0.6 ? "#4ade80" : pct > 0.3 ? "#facc15" : "#f87171";

  return (
    <div className="linear-timer-wrapper mt-4" aria-label={`Осталось ${seconds} секунд`}>
      <div
        className="linear-timer-bar"
        style={{ width, backgroundColor: color }}
      />
    </div>
  );
}
