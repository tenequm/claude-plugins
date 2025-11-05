---
"chrome-extension-wxt": minor
---

Fix critical API issues and add chrome.scripting support

- Fix sidePanel.getLayout() return type: use `side` property instead of `position` (matches official Chrome API)
- Remove deprecated tabs.executeScript() and tabs.insertCSS() (Manifest V2 APIs)
- Add comprehensive chrome.scripting API section with executeScript(), insertCSS(), removeCSS(), and dynamic content script registration
- Update React version references from 18+ to 19 (current stable)
- Remove speculative Chrome 143 features section

Sources: Chrome Extension API docs, WXT docs, verified Nov 2025
