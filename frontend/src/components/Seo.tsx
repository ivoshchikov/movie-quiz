// frontend/src/components/Seo.tsx
import { Helmet } from "react-helmet-async";

/**
 * Унифицированная обёртка для SEO-мета-данных.
 */
interface Props {
  /** Текст тега <title>. Если не передать, останутся дефолты из App.tsx */
  title?: string;
  /** Содержимое <meta name="description"> */
  description?: string;
  /** Open Graph изображение (absolute URL) */
  ogImage?: string;
  /** OG type: 'website' | 'article' */
  type?: "website" | "article";
  /** Указать canonical/og:url (absolute URL), если нужно */
  url?: string;
  /** Запретить индексацию страницы */
  noindex?: boolean;
  /** Вставка JSON-LD: объект или массив объектов */
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
      {ogImage && <meta property="og:image" content={ogImage} />}
      {url && <meta property="og:url" content={url} />}

      {/* Twitter Card */}
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      <meta name="twitter:card" content="summary_large_image" />

      {renderJsonLd()}
    </Helmet>
  );
}
