# Skills Repository Instructions for Claude

<identity>
You are assisting with maintaining a public repository of Claude Code skills. This repository contains carefully crafted, validated skills following Anthropic's best practices.

**Core Principle:** Focus exclusively on value-adding changes. Do not create unnecessary files, summaries, or documentation. Every file and every line must serve a direct purpose for the skill or end users.
</identity>

<repository_overview>
## About This Repository

**Purpose:** Public collection of production-ready Claude Code skills for various development tasks.

**Owner:** Mykhaylo Kolesnik (@opwizardx)

**Quality Standards:**
- All skills must score 10/10 on Anthropic best practices
- Follow progressive disclosure pattern (SKILL.md + references/)
- Use up-to-date information only (verify against official docs)
- Include working code examples
- Link to official documentation

**Repository Structure:**
```
[REPO_PATH]/
├── .changeset/                   # Changesets for version management
│   └── config.json               # Changesets configuration
├── .claude/                      # Repository meta (not published)
│   ├── CLAUDE.md                # This file - instructions for Claude
│   └── skills/
│       └── skill-creator/       # Official Anthropic skill-creator tool
├── .claude-plugin/              # Plugin marketplace configuration
│   └── marketplace.json         # Plugin registry (auto-synced)
├── .github/                     # GitHub Actions workflows
│   └── workflows/
│       ├── release.yml          # Automated releases with Changesets
│       └── validate.yml         # Pre-commit validation
├── .git/                        # Git repository
├── .gitignore                   # Standard ignores
├── .pre-commit-config.yaml      # Pre-commit hooks configuration
├── LICENSE                      # MIT License
├── README.md                    # Public-facing documentation
├── package.json                 # Root package (pnpm workspace)
├── pnpm-lock.yaml              # Lockfile
├── pnpm-workspace.yaml         # Workspace configuration
├── scripts/                     # Build and release scripts
│   └── sync-marketplace.sh     # Sync versions to marketplace.json
└── [plugin-name]/              # Individual plugins (root level, pnpm workspace packages)
    ├── package.json            # Plugin package with version
    └── skill/                  # Skill content directory
        ├── SKILL.md            # Main skill file (frontmatter + overview)
        ├── references/         # Progressive disclosure content
        │   └── *.md            # Detailed guides
        ├── scripts/            # Helper scripts (optional)
        └── assets/             # Templates, examples (optional)
```

**Current Plugins:**
1. **chrome-extension-wxt** - Chrome extension development with WXT framework
   - React 19 integration
   - Chrome 140+ APIs
   - Modern UI libraries (shadcn/ui, Mantine)
   - Quality: 10/10 ✅

2. **gh-cli** - GitHub CLI for remote repository operations
   - Remote repository analysis
   - File fetching without cloning
   - Codebase comparison
   - Trending repositories discovery
   - Quality: 10/10 ✅

**Package Management:**
This repository uses pnpm workspaces and Changesets for version management:
- Each plugin is a pnpm workspace package with its own `package.json`
- Plugin versions are managed via Changesets (`.changeset/` directory)
- The `.claude-plugin/marketplace.json` is auto-synced from plugin package versions
- GitHub Actions automatically creates version PRs and releases
- Each plugin contains a `skill/` subdirectory with the actual skill content

</repository_overview>

<creating_new_skills>
## Creating New Skills

### Workflow When User Requests a New Skill

1. **Research Phase**
   - Search for latest best practices and current trends
   - Review modern code patterns and examples
   - Consult official documentation
   - Verify information is current (check dates, versions)
   - Note any framework/tool versions

2. **Planning Phase**
   - Identify core topics for SKILL.md (keep concise, <500 lines)
   - Identify detailed topics for references/*.md
   - Plan progressive disclosure structure
   - List required reference files

3. **Creation Phase**
   - Use skill-creator tool to initialize skill
   - Write SKILL.md with clear frontmatter
   - Create reference files as needed
   - Include working code examples
   - Link to official documentation

4. **Validation Phase**
   - Run quick_validate.py to ensure quality
   - Check best practices score (must be 10/10)
   - Verify all links work
   - Test code examples

5. **Documentation Phase**
   - Update main README.md to list new skill
   - Git commit with clear message

### Using skill-creator Tool

The official Anthropic skill-creator is available at:
`[REPO_PATH]/.claude/skills/skill-creator/`

#### Initialize New Plugin

```bash
# 1. Create plugin directory
mkdir -p [REPO_PATH]/[plugin-name]/skill

# 2. Initialize skill structure
python3 [REPO_PATH]/.claude/skills/skill-creator/scripts/init_skill.py \
  [plugin-name] \
  --path [REPO_PATH]/[plugin-name]/skill

# This creates:
# [REPO_PATH]/[plugin-name]/skill/
# ├── SKILL.md
# ├── references/
# ├── scripts/
# └── assets/

# 3. Create package.json for the plugin
cat > [REPO_PATH]/[plugin-name]/package.json <<EOF
{
  "name": "[plugin-name]-skill",
  "version": "1.0.0",
  "private": true,
  "description": "Your plugin description here",
  "scripts": {
    "validate": "python3 ../../../.claude/skills/skill-creator/scripts/quick_validate.py ./skill"
  }
}
EOF

# 4. Add to pnpm workspace
echo "  - '[plugin-name]'" >> [REPO_PATH]/pnpm-workspace.yaml

# 5. Add to marketplace.json
# Edit .claude-plugin/marketplace.json and add the plugin entry:
# {
#   "name": "[plugin-name]",
#   "source": "./",
#   "description": "Your description",
#   "version": "1.0.0",
#   "skills": ["./[plugin-name]/skill"]
# }
```

#### Validate Plugin

```bash
# Validate skill structure and best practices
python3 [REPO_PATH]/.claude/skills/skill-creator/scripts/quick_validate.py \
  [REPO_PATH]/[plugin-name]/skill

# Or use pnpm from the plugin directory
cd [REPO_PATH]/[plugin-name]
pnpm validate

# Output shows:
# - Skill validity ✅ or ❌
# - Best practices score (aim for 10.0/10)
# - Specific issues to fix
```

### skill-creator Script Details

#### 1. init_skill.py
Creates initial skill structure with proper directories.

**Usage:**
```bash
python3 [REPO_PATH]/.claude/skills/skill-creator/scripts/init_skill.py \
  skill-name \
  --path [REPO_PATH] \
  --description "Brief skill description"
```

**Creates:**
- SKILL.md with proper frontmatter template
- references/ directory for detailed docs
- scripts/ directory for helper utilities
- assets/ directory for templates/examples

#### 2. quick_validate.py
Validates skill against Anthropic best practices.

**Checks:**
- ✅ SKILL.md has proper frontmatter (name, description)
- ✅ Description includes trigger keywords
- ✅ SKILL.md is concise (<500 lines recommended)
- ✅ Uses progressive disclosure (references/)
- ✅ Contains concrete examples
- ✅ Has clear structure
- ✅ No anti-patterns

**Best Practices Score:**
- 10.0/10: Perfect ✅
- 8.0-9.9: Good, minor improvements
- 6.0-7.9: Acceptable, needs work
- <6.0: Does not meet standards ❌

#### 3. package_skill.py
Creates .zip package for distribution.

**Output:** `skill-name-vX.Y.Z.zip`

### Release Workflow with Changesets

This repository uses Changesets for version management and automated releases.

#### Creating a Changeset

When you modify a skill, create a changeset to document the change:

```bash
# 1. Make your changes to a plugin's skill
vim [plugin-name]/skill/SKILL.md

# 2. Validate your changes
cd [plugin-name]
pnpm validate

# 3. Create a changeset
cd [REPO_PATH]
pnpm changeset

# Follow the interactive prompts:
# - Select which plugin(s) changed (space to select, enter to confirm)
# - Choose bump type (patch/minor/major)
# - Write a summary of changes

# This creates a markdown file in .changeset/
```

#### Version Bump Guidelines

- **Patch (1.0.x)**: Bug fixes, typos, link corrections, small improvements
- **Minor (1.x.0)**: New features, sections, examples, significant additions
- **Major (x.0.0)**: Breaking changes (skill structure changes, removed features)

#### What Happens Next

1. Commit your changes and the changeset file
2. Push to GitHub
3. GitHub Actions detects the changeset
4. A "Version Packages" PR is automatically created or updated
5. When the PR is merged:
   - Plugin versions are bumped in `package.json`
   - `marketplace.json` is automatically synced via `sync-marketplace.sh`
   - Git tags are created
   - GitHub releases are published

#### Manual Release Commands

```bash
# Sync marketplace.json with skill versions
pnpm sync-marketplace

# Validate all skills
pnpm validate

# Create git tags from changesets (used in CI)
pnpm release
```

</creating_new_skills>

<best_practices>
## Anthropic Best Practices for Skills

### SKILL.md Structure

```markdown
---
name: skill-name
description: Clear, concise description with trigger keywords. Use when [scenarios]. Triggers on phrases like "keyword1", "keyword2", or file patterns like *.config.ts.
---

# Skill Title

Brief overview of what this skill helps with.

## When to Use This Skill

- Scenario 1
- Scenario 2
- Scenario 3

## Quick Start Workflow

1. Step 1
2. Step 2
3. Step 3

## Core Concepts

### Concept 1
Brief explanation with minimal code example.

### Concept 2
Brief explanation with minimal code example.

## Advanced Topics

For detailed information, see reference files:
- **Topic 1**: See `references/topic1.md` for detailed guide
- **Topic 2**: See `references/topic2.md` for comprehensive reference

## Resources

- Official Docs: [link]
- GitHub: [link]
```

### Progressive Disclosure

**Principle:** Load only what's needed for the current task.

**Structure:**
1. **Metadata (frontmatter)** - Always loaded, enables skill discovery
2. **SKILL.md** - Loaded when skill triggers (keep concise)
3. **references/*.md** - Loaded on-demand by Claude

**Example:**
```
User: "Create a simple app"
→ Loads: SKILL.md only (500 words)

User: "How do I configure advanced features?"
→ Loads: SKILL.md + references/advanced-config.md (1,500 words)

Context savings: 67%
```

### Code Examples

**Good ✅:**
```typescript
// Complete, working example
export default defineConfig({
  name: 'My App',
  version: '1.0.0',
  // Real configuration
});
```

**Bad ❌:**
```typescript
// Incomplete pseudocode
config = {
  // ... your config here
}
```

### Documentation Links

**Always link to official docs:**
```markdown
**Official Docs:** https://example.com/docs/api/feature

See the [official guide](https://example.com/guide) for more details.
```

### Trigger Keywords

**Include in description:**
- Common phrases users say
- Related technologies
- File patterns
- Use cases

**Example:**
```yaml
description: Build web apps with Vite. Use when creating frontend projects, setting up build tools, or working with modern JavaScript. Triggers on phrases like "vite project", "frontend build", or file patterns like vite.config.ts.
```

</best_practices>

<quality_standards>
## Quality Standards for This Repository

### Required for All Skills

1. **Research Quality**
   - Use official documentation as primary source
   - Verify information is current (check dates, versions)
   - Cross-reference multiple sources
   - Search for latest best practices and current trends

2. **Content Quality**
   - No deprecated APIs or outdated patterns
   - Working code examples (not pseudocode)
   - Clear, concise writing - NO FLUFF OR FILLER
   - Proper markdown formatting
   - Code blocks with language tags
   - Every sentence must add value

3. **Structure Quality**
   - SKILL.md: 200-500 lines (concise overview)
   - Progressive disclosure (references/)
   - Validation score: 10.0/10
   - Proper frontmatter with triggers

4. **Documentation Quality**
   - Clear "When to Use" section
   - Quick start workflow
   - Official documentation links
   - Troubleshooting section
   - Current year/version references

### Validation Checklist

Before committing a new skill:

```bash
# 1. Validate structure
cd [REPO_PATH]/[plugin-name]
pnpm validate

# Expected: ✅ Skill is valid! Score: 10.0/10

# 2. Check file sizes
du -sh [REPO_PATH]/[plugin-name]/skill/
# SKILL.md should be 5-20KB
# references/*.md can be 10-50KB each

# 3. Validate all plugins in workspace
cd [REPO_PATH]
pnpm validate

# 4. Test skill with Claude
# Load the skill and test with real queries

# 5. Update README.md
# Add plugin to the list with description

# 6. Update .claude-plugin/marketplace.json
# Add the plugin entry to the plugins array
```

</quality_standards>

<workflow_example>
## Example: Adding a New Skill

### User Request
> "Can you create a skill for building APIs with Hono framework?"

### Your Response Process

1. **Research (5-10 minutes)**
```bash
# Research the technology
- Latest Hono version and features
- Best practices for 2025
- Popular patterns and use cases
- Integration with common tools
```

2. **Initialize Plugin**
```bash
# Create plugin directory structure
mkdir -p [REPO_PATH]/hono-api/skill

# Initialize skill
python3 [REPO_PATH]/.claude/skills/skill-creator/scripts/init_skill.py \
  hono-api \
  --path [REPO_PATH]/hono-api/skill \
  --description "Build fast APIs with Hono framework"

# Create package.json
cat > [REPO_PATH]/hono-api/package.json <<EOF
{
  "name": "hono-api-skill",
  "version": "1.0.0",
  "private": true,
  "description": "Build fast APIs with Hono framework",
  "scripts": {
    "validate": "python3 ../../../.claude/skills/skill-creator/scripts/quick_validate.py ./skill"
  }
}
EOF

# Add to pnpm workspace
echo "  - 'hono-api'" >> [REPO_PATH]/pnpm-workspace.yaml

# Add to marketplace.json (manually edit .claude-plugin/marketplace.json)
```

3. **Create Content**

**SKILL.md (concise overview):**
- When to use Hono
- Quick start workflow
- Core concepts with minimal examples
- Reference to detailed guides

**references/hono-api.md:**
- Complete API reference
- Advanced routing patterns
- Middleware examples

**references/deployment.md:**
- Cloudflare Workers deployment
- Vercel deployment
- Traditional Node.js hosting

4. **Validate**
```bash
cd [REPO_PATH]/hono-api
pnpm validate

# Fix any issues until: ✅ Score: 10.0/10
```

5. **Update Documentation**
- Update [REPO_PATH]/README.md with new plugin entry
- Add entry to [REPO_PATH]/.claude-plugin/marketplace.json

6. **Create Changeset**
```bash
cd [REPO_PATH]
pnpm changeset
# Select hono-api
# Choose "minor" (new feature)
# Write: "Initial release of Hono API plugin"
```

7. **Commit**
```bash
cd [REPO_PATH]
git add hono-api/ README.md .claude-plugin/marketplace.json .changeset/ pnpm-workspace.yaml
git commit -m "feat: add hono-api plugin

- Complete Hono framework guide
- API development patterns
- Deployment strategies
- All examples tested and current"
```

</workflow_example>

<research_approach>
## Research Approach for New Skills

When creating a new skill, thorough research ensures accuracy and relevance.

### Research Workflow

For each new skill:

1. **Official Documentation** - Primary source of truth
   - Visit official project documentation
   - Review API references and guides
   - Check version compatibility and requirements
   - Note any migration guides or breaking changes

2. **Code Examples** - Real-world patterns
   - Review official examples and starter templates
   - Check popular GitHub repositories using the technology
   - Look for common patterns and best practices
   - Identify popular library integrations

3. **Community Resources** - Current best practices
   - Check official blog posts and release notes
   - Review community guides and tutorials
   - Look for recent discussions on implementation patterns
   - Identify common pitfalls and solutions

4. **Validate Currency** - Ensure information is current
   - Look for version numbers
   - Check "last updated" dates
   - Verify no deprecated features
   - Confirm compatibility with latest versions
   - Cross-reference multiple sources

### Quality Checklist

Before creating skill content:
- ✅ Verified against official documentation
- ✅ Confirmed version numbers and compatibility
- ✅ Tested code examples (when possible)
- ✅ Checked for deprecated APIs or patterns
- ✅ Reviewed recent release notes
- ✅ Documented all sources for reference

</research_approach>

<git_workflow>
## Git Commit Standards

### Commit Message Format

```
type: brief description (max 72 chars)

- Detailed change 1
- Detailed change 2
- Detailed change 3

[optional footer with sources, context]
```

### Commit Types

- **feat:** New skill added
- **update:** Existing skill updated with new content
- **fix:** Corrections to existing content
- **docs:** Documentation changes (README, etc.)
- **refactor:** Restructure without content changes
- **chore:** Maintenance tasks

### Examples

```bash
# Adding new skill
git commit -m "feat: add solana-development skill

- Solana program development with Anchor
- Web3.js integration patterns
- Wallet adapter setup
- Testing with Bankrun
- Deployment to devnet/mainnet

Sources: Solana docs, Anchor v0.30.x, verified Nov 2025"

# Updating existing plugin
git commit -m "update: chrome-extension-wxt with Chrome 143 APIs

- Add Chrome 143 features reference
- Update manifest V3 migration deadline
- Add new declarativeNetRequest patterns

Sources: Chrome Platform Status, verified Dec 2025"

# Fixing issues
git commit -m "fix: correct TypeScript syntax in hono-api examples

- Update middleware type definitions
- Fix context type annotations
- Ensure all examples compile with TS 5.3+"
```

</git_workflow>

<user_communication>
## Communicating with User

### When Starting a New Skill

1. **Clarify Requirements**
   ```
   "I'll create a [technology] skill for this repository.

   Before I start, what are your main use cases?
   - Use case A?
   - Use case B?
   - Any specific integrations needed?"
   ```

2. **Explain Research Plan**
   ```
   "I'll research:
   1. Latest [technology] version and features
   2. Best practices for 2025
   3. Common patterns and integrations

   This will take about 10 minutes."
   ```

3. **Show Progress**
   ```
   "Research complete. Found:
   - [Technology] v1.2.3 (latest stable)
   - 5 major features to cover
   - Integration patterns for X, Y, Z

   Creating skill structure now..."
   ```

4. **Present Results**
   ```
   "✅ Skill created and validated!

   Quality Score: 10.0/10

   Created:
   - SKILL.md (350 lines) - Overview and quick start
   - references/api.md (800 lines) - Complete API reference
   - references/patterns.md (600 lines) - Common patterns

   Ready to commit?"
   ```

### When Updating Existing Skill

1. **Explain What Changed**
   ```
   "I'll update [skill-name] with [new feature].

   Changes needed:
   - Add section to SKILL.md
   - Create new reference file
   - Update existing examples

   Researching latest info now..."
   ```

2. **Show Validation**
   ```
   "✅ Updates complete!

   - Added 150 lines of new content
   - Validation still passes (10.0/10)
   - All examples tested

   Updated:
   - SKILL.md: +25 lines
   - references/new-feature.md: 125 lines (new)

   Ready to commit?"
   ```

</user_communication>

<important_notes>
## Important Notes

### DO ✅

- **Always** validate with quick_validate.py before committing
- **Always** use up-to-date information (check sources)
- **Always** include working code examples
- **Always** link to official documentation
- **Always** use progressive disclosure pattern
- **Always** update README.md when adding skills
- **Always** focus on value-adding changes only

### DON'T ❌

- **NEVER** create unnecessary files or documentation
- **NEVER** add fluff, filler, or "water" content
- **NEVER** create summary documents unless explicitly requested
- **NEVER** write content that doesn't directly add value
- Don't include deprecated APIs or patterns
- Don't use pseudocode (all examples must work)
- Don't create single-file skills (use progressive disclosure)
- Don't skip validation step
- Don't commit without testing examples
- Don't forget to check dates and versions
- Don't include personal API keys or secrets

### File Creation Policy

**CRITICAL:** Only create files that are absolutely necessary:
- SKILL.md (required)
- references/*.md (only when SKILL.md would be too long)
- scripts/*.py (only for reusable automation)
- assets/* (only for templates/resources used in output)

**DO NOT CREATE:**
- Summary documents
- Update logs
- Changelog files
- Documentation about documentation
- Any file that is not directly used by the skill or end users

### Repository-Specific Rules

1. **Plugin structure** - Each plugin is a directory with `package.json` and `skill/` subdirectory
   ```
   ✅ [REPO_PATH]/hono-api/
       ├── package.json
       └── skill/
   ❌ [REPO_PATH]/hono-api-skill/SKILL.md
   ```

2. **All plugins at root level** (not nested in subdirectories)
   ```
   ✅ [REPO_PATH]/plugin-name/
   ❌ [REPO_PATH]/category/plugin-name/
   ```

3. **Each plugin must be a pnpm workspace package**
   - Must have `package.json` with name (ending in `-skill`), version, and validate script
   - Must be listed in `pnpm-workspace.yaml`
   - Must be listed in `.claude-plugin/marketplace.json` with correct skill path
   - Skill content goes in `skill/` subdirectory

4. **Version management via Changesets**
   - All version changes must go through changesets
   - Never manually edit version numbers in `package.json`
   - Use `pnpm changeset` to document changes
   - Sync script reads version from plugin's `package.json`

5. **Quality over quantity** - Better to have 5 perfect plugins than 20 mediocre ones

6. **Public repository** - All content will be public on GitHub
   - No proprietary code
   - No sensitive information
   - Attribution to sources

7. **Maintenance** - Keep plugins current
   - Update when major versions release
   - Add notes about deprecated features
   - Remove outdated patterns

</important_notes>

<skill_ideas>
## Potential Skills to Create

When user hasn't specified, you can suggest these high-value skills:

### Web Development
- **react-modern** - React 19+ with Server Components
- **nextjs-app-router** - Next.js 14+ App Router patterns
- **astro-sites** - Astro for content-rich sites
- **vite-projects** - Vite build tool and plugins

### Backend Development
- **hono-api** - Hono for edge APIs
- **trpc-backend** - tRPC for type-safe APIs
- **drizzle-orm** - Drizzle ORM with migrations
- **prisma-database** - Prisma for database access

### Blockchain Development
- **solana-programs** - Solana program development with Anchor
- **ethereum-contracts** - Smart contracts with Hardhat
- **web3-integration** - Web3 wallet and provider integration

### DevOps & Tooling
- **docker-compose** - Docker Compose for development
- **github-actions** - GitHub Actions CI/CD
- **vercel-deploy** - Vercel deployment patterns
- **cloudflare-workers** - Cloudflare Workers development

### Testing
- **vitest-testing** - Vitest for unit/integration tests
- **playwright-e2e** - Playwright for E2E testing
- **msw-mocking** - MSW for API mocking

### AI & ML
- **openai-integration** - OpenAI API patterns
- **langchain-apps** - LangChain application development
- **huggingface-models** - Hugging Face model usage

</skill_ideas>

---

## Summary

This repository is a curated collection of high-quality Claude Code skills. When creating or updating skills:

1. **Research thoroughly** - Use official docs, verify dates, check examples
2. **Use skill-creator** - Initialize with proper structure
3. **Follow best practices** - Progressive disclosure, 10/10 validation
4. **Stay focused** - Only value-adding changes, no unnecessary files
5. **Commit clearly** - Descriptive messages with sources

**Goal:** Make this the go-to repository for production-ready Claude Code skills.

**Philosophy:** Quality over quantity. Every file, every line, every word must serve a purpose.
