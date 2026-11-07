import { useCallback, useState } from "react";
import { useAuth } from "../AuthContext";
import { useReadRequest } from "../hooks/useReadRequest";
import { gameplayRpc } from "../game/server";
import { getPublicUrl } from "../supabase";
import type { ContentMetadata } from "../contentBundle/types";
import ImageCredit from "./ImageCredit";

interface Props {
  // These portraits already show their names in the preference game.
  mode: "comparison";
  person: number;
  imagePath?: string;
  label?: string;
}
interface Credit {
  image_url: string;
  metadata: ContentMetadata;
}
function CreditList({ mode, person, imagePath }: Props) {
  const { user } = useAuth();
  const load = useCallback(
    async (signal: AbortSignal) => {
      const value = await gameplayRpc<Credit[]>(
        "question_image_credits",
        {
          p_mode: mode,
          p_session: null,
          p_date: null,
          p_person: person,
          p_image_path: imagePath ?? null,
        },
        signal,
      );
      if (
        !Array.isArray(value) ||
        value.length > 5000 ||
        value.some(
          (v) =>
            !v ||
            typeof v.image_url !== "string" ||
            !v.metadata?.image ||
            typeof v.metadata.image.attribution_text !== "string",
        )
      )
        throw Error("Credits unavailable");
      return value;
    },
    [mode, person, imagePath],
  );
  const request = useReadRequest(
    `${user?.id ?? "guest"}:${mode}:${person}:${imagePath}`,
    load,
  );
  return request.loading ? (
    <p role="status">Loading image credits…</p>
  ) : request.error ? (
    <p role="alert">
      Image credits could not load.{" "}
      <button className="hq-inline-action" onClick={request.retry}>
        Retry credits
      </button>
    </p>
  ) : request.value?.length ? (
    <ul>
      {request.value.map((row, i) => (
        <li key={`${row.image_url}:${i}`}>
          <img
            src={getPublicUrl(row.image_url)}
            alt={`Credited image ${i + 1}`}
            width="120"
            height="90"
            loading="lazy"
            style={{ objectFit: "contain" }}
          />
          <ImageCredit metadata={row.metadata} />
        </li>
      ))}
    </ul>
  ) : (
    <p>No additional image credits are recorded for these images.</p>
  );
}
export default function GameImageCredits(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="hq-image-credits"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary aria-label={props.label}>Image credits</summary>
      {open && <CreditList {...props} />}
    </details>
  );
}
