# Site themes

Theme update, 2026-10-15. Release and production verification are recorded in the associated pull request.

- The original dark theme remains the default. The sun/moon button in the main and game headers switches between dark and light.
- A valid `hard-quiz-theme` browser preference is restored in the HTML head before the application starts. The choice persists across navigation and reloads, and synchronizes between tabs.
- If browser storage is unavailable, switching still works for the current document. Persistence after closing or reloading that document is not guaranteed.
- Shared CSS properties cover public pages, articles, game feedback, account forms, dialogs, tables and administration. Photographs and the illustrative optical diagrams retain their image colors.
- Both palettes include readable status colors, visible keyboard focus, native input color schemes, and a minimum 44 px theme control. Mobile headers retain the existing navigation layout.

Verification covers preference persistence, invalid preferences, storage denial, cross-tab updates, the first HTML response without the application bundle, text/control contrast, mobile widths, account dialogs and changing themes during a running quiz or Daily attempt. Administrative checks use isolated fixture data.

This is an appearance preference. Game rules, API contracts, question data, access checks and the Daily timezone remain unchanged.
