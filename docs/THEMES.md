# Site themes

Theme update, 2026-10-15. Release and production verification are recorded in the associated pull request.

- The original dark theme remains the default. A three-position slider in the main and game headers selects Light, Dark or Halloween, from left to right. It supports dragging, tapping, arrow keys, Home and End.
- A valid `hard-quiz-theme` browser preference is restored in the HTML head before the application starts. The choice persists across navigation and reloads, and synchronizes between tabs.
- If browser storage is unavailable, switching still works for the current document. Persistence after closing or reloading that document is not guaranteed.
- Shared CSS properties cover public pages, articles, game feedback, account forms, dialogs, tables and administration. Photographs and the illustrative optical diagrams retain their image colors.
- All three palettes include readable status colors, visible keyboard focus, native input color schemes, and a 44 px high theme control. Mobile headers retain the existing navigation layout.

Halloween is a seasonal, opt-in theme with a plum background, orange accents and decorative webs, spiders, a pumpkin, potions, a cauldron, a skeleton, a witch and bats. Lightweight inline vectors require no image downloads. Decorative layers are hidden from assistive technology and ignore pointer events. The seasonal strip is omitted during gameplay; the question image and answer controls stay clear. Decorations disappear immediately when another theme is selected. No activation or retirement date is imposed; the seasonal option can be retired separately.

Halloween also has occasional four-second visitors: a spider scuttles along the lower edge and a witch flies by the side. The first visit starts after ten seconds; visitors alternate with a 32-second quiet interval. They ignore pointer input and stay outside the accessibility tree. The seasonal strip includes a keyboard-accessible pause/resume control; its state lasts while navigating in the current document.

Visitors stop and pending timers are cleared when another theme is selected, a regular quiz or Daily question is active, the tab is hidden, or the device requests reduced motion. Returning to the tab or re-enabling motion starts a fresh ten-second wait, without catching up on missed visits. Reduced motion keeps static decoration and hides the motion control. No animation assets or dependencies are downloaded.

Verification covers visitor movement and quiet intervals, pause/resume, reduced motion including preference changes, background tabs, gameplay suppression, preference persistence, invalid preferences, storage denial, cross-tab updates, the first HTML response without the application bundle, text/control contrast, mobile widths, account dialogs and changing themes during a running quiz or Daily attempt. Administrative checks use isolated fixture data.

This is an appearance preference. Game rules, API contracts, question data, access checks and the Daily timezone remain unchanged.
