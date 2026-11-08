# Consent and optional measurement

Stage 11 implementation, 8 November 2026. Advertising remains disabled. This
document describes the application contract; account observations and release
evidence belong in the private owner report.

## Before permission

The consent bridge starts denied. It creates no optional visitor, page-view,
article or analytics-run identifiers and does not load the Google Analytics tag
or send first-party measurement RPCs. It also excludes the owner, administration,
preview hosts and the privacy-policy document as before. Existing bot exclusions
continue to apply to first-party counts. Necessary authentication, requested
games, results and security processing are separate.

The standalone Google Privacy & messaging tag is the exact publisher tag supplied
by the existing account. It initializes the certified Google CMP (CMP ID 300) and
the TCF/GPP privacy interfaces. It is not the AdSense advertising SDK. No ad units,
Auto ads calls, Offerwall, recovery message or error-protection script are added.
The CMP makes its own technical requests to present and remember privacy choices.

## Permission decisions

For European TCF consent, a loaded Google CMP and a settled `tcloaded` or
`useractioncomplete` event are required. Publisher consent to purposes 1 and 8
permits the content/visit counters. Purpose 9 and Google's explicit analytics
Consent Mode value `GRANTED` (1) are additionally required for Google Analytics.
Unknown, denied, not-applicable and not-configured values never grant analytics.
Legitimate interest does not grant these optional measurements.

Outside that flow, a successful Google TCF response must first establish
`gdprApplies === false`. The site then requests a separate opt-in for its own
counters and for Google Analytics; both controls start unchecked. The versioned
choice expires after 180 days. Without readable storage, an explicit choice lasts
for the current document only. A regional exemption alone never authorizes tags.

Google's native US Do Not Sell or Share entry point is retained. The application
does not use the Ad Manager-only `overrideDnsLink` option in AdSense. Advertising
is off regardless of a user's advertising choice; GPP opt-outs cannot enable it.
Global Privacy Control conservatively keeps all optional measurement off.

Google Consent Mode is initialized denied before vendor loading. Google Analytics
uses basic loading: the tag is loaded only after the corresponding permission,
with manual sanitized SPA page views, advertising consent denied, advertising
redaction enabled and personalization/signals disabled. No pre-consent event queue
or denied-state cookieless analytics pings are intentionally sent.

## Withdrawal and failures

Privacy settings is always available. Each game header has a 44 px control with
an accessible name, so it neither overlaps image credits nor reduces field height.
Opening it immediately disables optional measurement, aborts active counter
requests, drops pending views and clears only optional analytics storage and GA
cookies. Necessary auth/game data is preserved. Other tabs receive a privacy
reset and must revalidate before collecting again. Earlier server measurements
are not erased by a browser withdrawal.

TCF errors, invalid CMP data, a failed tag and a 12-second loading timeout remain
denied. Users may keep playing and retry the privacy controls. The legacy
`?analytics=off` instruction remains a denial; `?analytics=on` only opens choices.

Google's controlled messaging callback defers a late message while a game is
running. The site's own settings dialog also waits until that game ends; optional
measurement is already off during the wait. Returning valid permission can be
read during a restored game without opening a consent overlay. Events observed
before consent or after withdrawal are not replayed.

The fresh `/privacy` document loads neither CMP nor GA. Public links use a full
document navigation, and an internal SPA transition from an initialized CMP
reloads that policy document. Its settings link opens the controls on the home
page, as required by Google's privacy-policy URL guidance.

## Verification boundaries

Isolated browser tests exercise the documented Google/TCF callback protocol and
observe actual tag attempts, storage and counter requests. They cover explicit
grant/denial, partial purposes, repeat visits, unknown enums, malformed updates,
withdrawal during an in-flight request, cross-tab reset, storage failure, GPC,
late messages during gameplay, policy exclusions and responsive keyboard access.
Existing analytics attribution, restored game and admin-counter tests now supply
explicit consent fixtures where measurement is part of the test.

Fixture success does not prove Google's real regional message delivery. Release
verification must separately record the actual CMP's UI/API and network results,
the deployed revision and the absence of advertising requests. Do not claim site
review approval or legal compliance from the presence of a CMP alone.

Sources checked 8 November 2026:

- [Privacy & messaging JavaScript API](https://developers.google.com/funding-choices/fc-api-docs)
- [European message configuration](https://support.google.com/adsense/answer/10960768?hl=en)
- [Google CMP and TCF](https://support.google.com/adsense/answer/12226986?hl=en)
- [Privacy-policy URL requirements](https://support.google.com/adsense/answer/10961370?hl=en-GB)
- [US state messages and GPP](https://support.google.com/adsense/answer/10961479?hl=en)
