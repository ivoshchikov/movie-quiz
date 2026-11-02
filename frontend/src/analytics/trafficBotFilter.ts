import policy from "./trafficBotPolicy.json";

const knownBot = new RegExp(policy.userAgentPattern, "i");

/** An exclusion heuristic, not proof that remaining visitors are human. */
export function isAutomatedTraffic(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.webdriver === true || !navigator.userAgent.trim() || knownBot.test(navigator.userAgent);
}
