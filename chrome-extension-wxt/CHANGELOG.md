# chrome-extension-wxt

## 1.1.0

### Minor Changes

- [`2bfebbe`](https://github.com/tenequm/claude-plugins/commit/2bfebbe3bee9e8b2f7c090b992fce3528a38b9c7) Thanks [@tenequm](https://github.com/tenequm)! - Fix critical API issues and add chrome.scripting support

  - Fix sidePanel.getLayout() return type: use `side` property instead of `position` (matches official Chrome API)
  - Remove deprecated tabs.executeScript() and tabs.insertCSS() (Manifest V2 APIs)
  - Add comprehensive chrome.scripting API section with executeScript(), insertCSS(), removeCSS(), and dynamic content script registration
  - Update React version references from 18+ to 19 (current stable)
  - Remove speculative Chrome 143 features section

  Sources: Chrome Extension API docs, WXT docs, verified Nov 2025

### Patch Changes

- [`e406e26`](https://github.com/tenequm/claude-plugins/commit/e406e26888bd1abf2b0aec660708dc8d712d027e) Thanks [@tenequm](https://github.com/tenequm)! - Rename repository and marketplace

  - Repository renamed from `claude-skills` to `claude-plugins`
  - Marketplace renamed from `tenequm-claude-plugins` to `tenequm-plugins`
  - Updated all repository references and URLs
  - Updated changelog commit URLs
  - Updated installation instructions in README
