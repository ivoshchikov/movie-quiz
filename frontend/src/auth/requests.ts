export const AUTH_TIMEOUT_MS = 10_000;
export const EMAIL_COOLDOWN_MS = 60_000;
export class AuthRequestTimeout extends Error {}
export function emailOutcomeUnknown(error: unknown): boolean {
  return error instanceof AuthRequestTimeout || error instanceof TypeError || (error as { name?: string })?.name === "AuthRetryableFetchError";
}

export async function withAuthTimeout<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([request, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new AuthRequestTimeout()), AUTH_TIMEOUT_MS);
    })]);
  } finally { clearTimeout(timer); }
}

export function authRequestMessage(error: unknown, email: boolean): string {
  if (emailOutcomeUnknown(error)) return email
    ? "We couldn’t confirm whether the link was sent. Check your inbox before requesting another link."
    : "Google sign-in did not open in time. Try again or use email.";
  const details = error as { code?: string; status?: number } | null;
  if (details?.status === 429 || details?.code === "over_email_send_rate_limit" || details?.code === "over_request_rate_limit") return "Too many sign-in requests. Please wait before trying again.";
  if (details?.code === "email_address_invalid" || details?.code === "validation_failed") return "Check your email address and try again.";
  if (details?.code === "email_provider_disabled" || details?.code === "provider_disabled") return email
    ? "Email sign-in is unavailable right now. Try Google or try again later."
    : "Google sign-in is unavailable right now. Try email or try again later.";
  return email ? "The link could not be sent. Check your connection and try again." : "Google sign-in could not be started. Try again or use email.";
}
