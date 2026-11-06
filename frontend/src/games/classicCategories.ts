import definitions from "./classicCategories.json";

export const classicCategories = definitions;
export type ClassicCategory = (typeof definitions)[number];

export function categoryMetadata(category: ClassicCategory, origin = "https://hard-quiz.com") {
  const url = `${origin}/${category.slug}`;
  return {
    title: category.title, description: category.description, url,
    jsonLd: [
      { "@context": "https://schema.org", "@type": "WebPage", name: category.heading, description: category.description, url },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Quiz games", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: category.label, item: url },
      ] },
    ],
  };
}
