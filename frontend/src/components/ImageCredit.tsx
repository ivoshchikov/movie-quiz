import { safeHttpUrl } from "../../../supabase/functions/admin-questions/content.mjs";
import type { ContentMetadata } from "../contentBundle/types";
import "../image-credits.css";

export default function ImageCredit({
  metadata,
}: {
  metadata?: ContentMetadata | null;
}) {
  if (!metadata?.image) return null;
  const image = metadata.image;
  const link = (url: unknown, label: string) =>
    safeHttpUrl(url) ? (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    ) : (
      <span>{label}</span>
    );
  return (
    <div className="hq-image-credit">
      <p>{image.attribution_text}</p>
      <p>
        {link(image.source_page_url, "Image source")} ·{" "}
        {link(image.license_url, image.derivative_license || image.license)}
      </p>
      {!!image.creator_urls?.length && (
        <p>
          Creator:{" "}
          {image.creator_urls.map((url, i) => (
            <span key={url}>
              {i > 0 && " · "}
              {link(url, image.preferred_credit || image.photographer)}
            </span>
          ))}
        </p>
      )}
      <p>Changes: {image.processing.changes}</p>
      {image.share_alike_required && (
        <p>Adapted image licensed under {image.derivative_license}.</p>
      )}
    </div>
  );
}
