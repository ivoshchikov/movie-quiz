// frontend/src/components/Seo.tsx
import { Helmet } from "react-helmet-async";

/**
 * Унифицированная обёртка для SEO-мета-данных.
 */
interface Props {
  title?: string;
  description?: string;
  ogImage?: string;
  type?: "website" | "article";
  url?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export default function Seo({
  title,
  description,
  ogImage,
  type = "website",
  url,
  noindex,
  jsonLd,
}: Props) {
  const siteName = "Hard Quiz";
  const defaultOg = "https://hard-quiz.com/og/logo.webp";
  const img = ogImage || defaultOg;

  const renderJsonLd = () => {
    if (!jsonLd) return null;
    const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    return arr.map((obj, i) => (
      <script key={i} type="application/ld+json">
        {JSON.stringify(obj)}
      </script>
    ));
  };

  return (
    <Helmet>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content={type} />
      {/* ✅ всегда есть картинка */}
      <meta property="og:image" content={img} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {url && <meta property="og:url" content={url} />}

      {/* Twitter Card */}
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={img} />
      <meta name="twitter:card" content="summary_large_image" />

      {renderJsonLd()}
    </Helmet>
  );
}
