import pageMetadata from "../pageMetadata.json";

export default function ThisThatIntro() {
  return <header className="hq-mode-heading"><h1>{pageMetadata["this-or-that"].heading}</h1><p>{pageMetadata["this-or-that"].intro}</p></header>;
}
