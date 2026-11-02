export interface BundleImage {
  file: string;
  mime_type: "image/webp";
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  source_page_url: string;
  photographer: string;
  license: string;
  license_url: string;
  attribution_required: boolean;
  attribution_text: string;
  attribution_html?: string;
  creator_urls?: string[];
  preferred_credit?: string;
  source_work_title?: string;
  share_alike_required?: boolean;
  derivative_license?: string;
  processing: { changes: string; [key: string]: unknown };
  [key: string]: unknown;
}
export interface BundleQuestion {
  temp_id: string;
  correct_answer: string;
  options: string[];
  correct_index: number;
  category_id: number;
  difficulty_level_id: number;
  image: BundleImage;
  category_name?: string;
  difficulty_name?: string;
  difficulty_key?: string;
  correct_option_label?: string;
  prompt?: string;
  identity?: {
    wikidata_id?: string;
    aliases?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
export interface ContentMetadata {
  image: BundleImage;
  identity?: BundleQuestion["identity"];
  editorial?: Record<string, unknown>;
}
export interface BundleIdentity {
  package_id: string;
  temp_id: string;
}
export interface BundleCatalog {
  categories: { id: number; name: string }[];
  levels: { id: number; name: string; key: string }[];
}
export interface BundleEntry {
  index: number;
  tempId: string;
  question?: BundleQuestion;
  errors: string[];
  warnings: string[];
}
export interface BundleValidation {
  packageId: string;
  manifestHash: string;
  entries: BundleEntry[];
  errors: string[];
  files: Map<string, Uint8Array>;
}
