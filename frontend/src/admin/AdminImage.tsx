import { useState } from "react";

export default function AdminImage({
  src,
  alt,
  preview = false,
  onReady,
}: {
  src: string;
  alt: string;
  preview?: boolean;
  onReady?: (ready: boolean) => void;
}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return (
    <div
      className={`hq-admin-image${preview ? " hq-admin-image-preview" : ""}`}
    >
      {src && !failed ? (
        <img
          key={attempt}
          src={src}
          alt={alt}
          loading={preview ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => onReady?.(true)}
          onError={() => {
            setFailed(true);
            onReady?.(false);
          }}
        />
      ) : (
        <div className="hq-admin-image-fallback">
          <span role="img" aria-label={alt}>
            Image unavailable
          </span>
          {preview && src && (
            <button
              className="hq-inline-action"
              onClick={() => {
                onReady?.(false);
                setFailed(false);
                setAttempt((value) => value + 1);
              }}
            >
              Retry image
            </button>
          )}
        </div>
      )}
    </div>
  );
}
