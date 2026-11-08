import type { Page } from "@playwright/test";

const configured = new WeakSet<Page>();
export const consentIsMocked = (page: Page) => configured.has(page);

/** An isolated implementation of the documented Google/TCF callback protocol. */
export async function mockConsent(page: Page, options: { region?: "europe" | "other"; granted?: boolean; delayed?: boolean } = {}) {
  configured.add(page);
  await page.route("https://fundingchoicesmessages.google.com/**", route => route.fulfill({
    contentType: "text/javascript", body: `(${install.toString()})(${JSON.stringify(options)})`,
  }));
}

function install(options: { region?: "europe" | "other"; granted?: boolean; delayed?: boolean }) {
  const w = window as unknown as {
    googlefc: { callbackQueue: Array<Record<string, () => void>>; controlledMessagingFunction?: (message: { proceed: (allowed: boolean) => void }) => void; getGoogleConsentModeValues?: () => unknown; showRevocationMessage?: () => void };
    __tcfapi: (command: string, version: number, callback: (data: unknown, success: boolean) => void) => void;
    __consentFixture: { emit: (patch: Record<string, unknown>, mode?: number) => void; start: () => void; message: () => void; proceeds: boolean[] };
  };
  const callbacks: Array<(data: unknown, success: boolean) => void> = [];
  let mode = options.granted ? 1 : 2;
  let data: Record<string, unknown> = { cmpId: 300, cmpStatus: "loaded", gdprApplies: options.region !== "other",
    eventStatus: options.granted ? "tcloaded" : "cmpuishown", tcString: "fixture-valid-consent",
    publisher: { consents: { 1: !!options.granted, 8: !!options.granted, 9: !!options.granted } } };
  const fc = w.googlefc;
  fc.getGoogleConsentModeValues = () => ({ analyticsStoragePurposeConsentStatus: mode,
    adStoragePurposeConsentStatus: 2, adUserDataPurposeConsentStatus: 2, adPersonalizationPurposeConsentStatus: 2 });
  w.__tcfapi = (command, _version, callback) => { if (command === "addEventListener") { callbacks.push(callback); callback(data, true); } };
  const queue = fc.callbackQueue.splice(0);
  const notify = () => callbacks.forEach(callback => callback(data, true));
  fc.showRevocationMessage = () => { data = { ...data, eventStatus: "cmpuishown", publisher: { consents: {} } }; mode = 2; notify(); };
  const run = (entry: Record<string, () => void>) => Object.values(entry).forEach(callback => callback());
  fc.callbackQueue.push = (...entries) => { entries.forEach(run); return entries.length; };
  const start = () => queue.forEach(run);
  w.__consentFixture = {
    emit(patch, nextMode = mode) { mode = nextMode; data = { ...data, ...patch }; notify(); }, start,
    message() { fc.controlledMessagingFunction?.({ proceed: value => w.__consentFixture.proceeds.push(value) }); }, proceeds: [],
  };
  if (!options.delayed) start();
}
