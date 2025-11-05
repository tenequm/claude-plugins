# Claude Skills Collection

Personal collection of Claude Code skills for various development tasks.

## Skills

| Name | Description | Last Updated |
|------|-------------|--------------|
| [chrome-extension-wxt](./chrome-extension-wxt) | Build modern Chrome extensions using WXT framework | 05 Nov 2025 |
| [gh-cli](./gh-cli) | GitHub CLI for remote repository analysis, file fetching, and discovering trending repos | 05 Nov 2025 |

## Installation

### Quick Install (Recommended)

Install skills as plugins using Claude Code's marketplace system:

```bash
# 1. Add this marketplace
/plugin marketplace add tenequm/claude-skills

# 2. Install specific skills
/plugin install gh-cli@claude-skills
/plugin install chrome-extension-wxt@claude-skills

# Or browse and install interactively
/plugin
```

### Alternative: Manual Installation

If you prefer to manage skills manually:

```bash
# Clone this repo to your preferred location
git clone https://github.com/tenequm/claude-skills.git

# Symlink skills to Claude's skills directory
ln -s /path/to/claude-skills/chrome-extension-wxt ~/.claude/skills/chrome-extension-wxt
ln -s /path/to/claude-skills/gh-cli ~/.claude/skills/gh-cli
```

## For Contributors

### Requirements

- Node.js 24+ LTS
- pnpm 10+

### Setup

```bash
pnpm install
```

### Making Changes to Skills

When you modify a skill, create a changeset to document the change:

```bash
# 1. Make your changes to a skill
vim gh-cli/SKILL.md

# 2. Validate your changes
pnpm validate gh-cli

# 3. Create a changeset
pnpm changeset
# Follow prompts:
#   - Select which skill(s) changed
#   - Choose bump type (patch/minor/major)
#   - Write a summary of changes

# 4. Commit everything including the changeset file
git add .
git commit -m "feat(gh-cli): add trending repos section"

# 5. Push
git push
```

**What happens next:**
1. GitHub Actions detects your changeset
2. A "Version Packages" PR is created/updated automatically
3. When merged: versions bump, marketplace.json updates, git tags created
4. Users can install: `/plugin marketplace update claude-skills`

### Versioning Guidelines

- **Patch** (1.0.x): Bug fixes, typos, link corrections, small improvements
- **Minor** (1.x.0): New features, sections, examples, significant additions
- **Major** (x.0.0): Breaking changes (skill structure changes, removed features)

### Validation

```bash
# Validate specific skill
pnpm validate gh-cli

# Validate all skills
pnpm validate:all
```

### Creating New Skills

Each skill should follow Anthropic's best practices:

1. Main file: `SKILL.md` (frontmatter + concise overview)
2. References: `references/*.md` (detailed documentation)
3. Optional: `scripts/`, `assets/` directories

See the [official skill-creator](https://github.com/anthropics/skills) for guidelines.

## Development

### Pre-commit Hooks

This repository uses pre-commit to validate skills before committing.

**Setup (requires [uv](https://docs.astral.sh/uv/)):**

```bash
# Install pre-commit hooks
uvx pre-commit install

# Run manually on all files
uvx pre-commit run --all-files
```

**What gets validated:**
- Skill structure (SKILL.md format, frontmatter)
- No secrets or API keys
- YAML syntax
- No trailing whitespace

### Continuous Integration

GitHub Actions automatically runs these checks on every push and pull request.

## License

MIT License - see [LICENSE](./LICENSE) file for details.
