import pageMetadata from "../pageMetadata.json";

export default function TimeAttackIntro() {
  return <header className="hq-mode-heading"><h1>{pageMetadata["time-attack"].heading}</h1><p>{pageMetadata["time-attack"].intro}</p></header>;
}
