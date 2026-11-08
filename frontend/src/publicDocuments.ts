import details from "./publicSiteDetails.json";
import metadata from "./publicDocumentMetadata.json";

export type PublicDocument = "about" | "privacy" | "contact";
export const publicDocumentPaths = Object.keys(metadata) as PublicDocument[];
export const publicDocumentMetadata = metadata;
export const publicSiteDetails = details;
export const publicContact = details.contactDetailsApproved
  ? { projectBrand: details.projectBrand, email: details.contactEmail }
  : null;

export function publicContactHref(subject: string): string | undefined {
  if (!publicContact?.email) return undefined;
  return `mailto:${encodeURIComponent(publicContact.email)}?subject=${encodeURIComponent(subject)}`;
}
