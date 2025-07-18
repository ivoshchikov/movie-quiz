// frontend/src/components/Seo.tsx
import { Helmet } from "react-helmet-async";

/**
 * Унифицированная обёртка для установки SEO-мета-данных на странице.
 *
 * Пример использования:
 * ```tsx
 * <Seo
 *   title="Guess movie posters | Hard Quiz"
 *   description="Play Hard Quiz and prove you’re the ultimate cinephile!"
 * />
 * ```
 */
interface Props {
  /** Текст тега <title>. Если не передать, остаётся «дефолт» из App.tsx */
  title?: string;

  /** Содержимое <meta name="description"> */
  description?: string;

  /** Open Graph изображение (URL). Если нужен превью-картинки для шаринга в соцсетях */
  ogImage?: string;
}

export default function Seo({ title, description, ogImage }: Props) {
  return (
    <Helmet>
      {title && <title>{title}</title>}

      {description && (
        <meta name="description" content={description} />
      )}

      {/* Open Graph (Facebook/LinkedIn/Telegram) */}
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter Card (X) */}
      {title && <meta name="twitter:title" content={title} />}
      {description && (
        <meta name="twitter:description" content={description} />
      )}
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* Можно расширять дальше — canonical, robots и т.д. */}
    </Helmet>
  );
}
