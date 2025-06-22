import React, { useMemo } from "react";

interface Props {
  /** Сколько секунд осталось (целое неотрицательное) */
  seconds: number;
  /** Сколько было всего секунд в раунде */
  total: number;
}

const R      = 22;                         // радиус
const CIRCUM = 2 * Math.PI * R;            // длина окружности

export default function CircleTimer({ seconds, total }: Props) {
  const pct     = useMemo(() => Math.max(0, seconds) / total, [seconds, total]);
  const offset  = CIRCUM * (1 - pct);
  const color   =
    pct > 0.6 ? "#4ade80" : pct > 0.3 ? "#facc15" : "#f87171";

  return (
    <svg
      className="circle-timer"
      width="56"
      height="56"
      viewBox="0 0 56 56"
      aria-label={`Осталось ${seconds} секунд`}
    >
      {/* серый фон-кружок */}
      <circle
        cx="28"
        cy="28"
        r={R}
        fill="none"
        stroke="#374151"
        strokeWidth="6"
      />
      {/* прогресс-душка */}
      <circle
        cx="28"
        cy="28"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={CIRCUM}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{
          transition: "stroke-dashoffset 1s linear, stroke 0.3s ease",
        }}
      />
      {/* текст с числами */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="14"
        fontWeight="600"
        fill="white"
      >
        {seconds}
      </text>
    </svg>
  );
}
