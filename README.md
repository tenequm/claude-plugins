# Claude Code Plugins

Plugin marketplace for Claude Code.

## Plugins

| Name | Version | Description |
|------|---------|-------------|
| [chrome-extension-wxt](./chrome-extension-wxt) | 1.1.0 | Skill: Build Chrome extensions with WXT framework |
| [cloudflare-workers](./cloudflare-workers) | 1.0.0 | Skill: Rapid development with Cloudflare Workers - build and deploy serverless applications |
| [gh-cli](./gh-cli) | 1.0.2 | Skill: GitHub CLI for remote repo analysis and code discovery |
| [skill-factory](./skill-factory) | 0.1.0 | Skill: Autonomous skill creation agent with guaranteed quality |
| [uv-ruff-python-tools](./uv-ruff-python-tools) | 0.1.0 | Skill: Modern Python development with uv (10-100x faster package manager) and ruff (extremely fast linter/formatter) |

## Installation

```bash
# Add marketplace
/plugin marketplace add tenequm/claude-plugins

# Install plugins
/plugin install gh-cli@tenequm-plugins
/plugin install chrome-extension-wxt@tenequm-plugins
/plugin install cloudflare-workers@tenequm-plugins
/plugin install skill-factory@tenequm-plugins
/plugin install uv-ruff-python-tools@tenequm-plugins
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
