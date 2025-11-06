---
name: gh-cli
description: GitHub CLI for remote repository analysis, file fetching, codebase comparison, and discovering trending code/repos. Use when analyzing repos without cloning, comparing codebases, or searching for popular GitHub projects.
---

# GitHub CLI - Remote Analysis & Discovery

Focused on efficient remote repository analysis and discovering trending content on GitHub.

## Remote Repository Analysis

### Fetch Files Without Cloning

```bash
# Get directory listing
gh api repos/OWNER/REPO/contents/PATH

# Fetch file content (decode base64)
gh api repos/OWNER/REPO/contents/path/file.ts | jq -r '.content' | base64 -d

# Get entire file tree recursively
gh api repos/OWNER/REPO/git/trees/main?recursive=1
```

### Compare Two Codebases

**Example:** "Are solana-fm/explorer-kit and tenequm/solana-idls providing the same functionality?"

**Workflow:**

1. **Fetch directory structures:**
   ```bash
   gh api repos/solana-fm/explorer-kit/contents/packages/explorerkit-idls > repo1.json
   gh api repos/tenequm/solana-idls/contents/ > repo2.json
   ```

2. **Compare file lists:**
   ```bash
   jq -r '.[].name' repo1.json > repo1-files.txt
   jq -r '.[].name' repo2.json > repo2-files.txt
   diff repo1-files.txt repo2-files.txt
   ```

3. **Fetch key files for comparison:**
   ```bash
   # Compare package.json dependencies
   gh api repos/solana-fm/explorer-kit/contents/packages/explorerkit-idls/package.json | jq -r '.content' | base64 -d > repo1-pkg.json
   gh api repos/tenequm/solana-idls/contents/package.json | jq -r '.content' | base64 -d > repo2-pkg.json

   # Compare main entry points
   gh api repos/solana-fm/explorer-kit/contents/packages/explorerkit-idls/src/index.ts | jq -r '.content' | base64 -d > repo1-index.ts
   gh api repos/tenequm/solana-idls/contents/src/index.ts | jq -r '.content' | base64 -d > repo2-index.ts
   ```

4. **Analyze:**
   - Compare exports and API surface
   - Compare dependencies
   - Identify unique features in each repo

### Useful Remote Analysis Patterns

```bash
# Check if file exists
gh api repos/OWNER/REPO/contents/path/file.ts 2>/dev/null && echo "exists" || echo "not found"

# Get latest commit for specific file
gh api repos/OWNER/REPO/commits?path=src/index.ts | jq -r '.[0].sha'

# Compare file across branches
gh api repos/OWNER/REPO/contents/file.ts?ref=main | jq -r '.content' | base64 -d > main.ts
gh api repos/OWNER/REPO/contents/file.ts?ref=dev | jq -r '.content' | base64 -d > dev.ts
diff main.ts dev.ts

# Get file from specific commit
gh api repos/OWNER/REPO/contents/file.ts?ref=abc123 | jq -r '.content' | base64 -d
```

## Discovering Trending Content

### Find Trending Repositories

```bash
# Most starred repositories (all time)
gh search repos --sort stars --order desc --limit 20

# Trending repos in specific language
gh search repos --language=rust --sort stars --order desc

# Recently popular (created in last month, sorted by stars)
gh search repos "created:>2024-10-01" --sort stars --order desc

# Trending in specific topic
gh search repos "topic:machine-learning" --sort stars --order desc

# Most active repos (by recent updates)
gh search repos --sort updated --order desc

# Most forked repos
gh search repos --sort forks --order desc

# Combined filters: Popular Solana repos updated recently
gh search repos "solana in:name,description stars:>100" --sort updated --order desc
```

### Discover Popular Code Patterns

```bash
# Find popular implementations
gh search code "function useWallet" --language=typescript --sort indexed

# Most starred code in specific language
gh search code "async fn main" --language=rust

# Find code in popular repos only
gh search code "implementation" "stars:>1000"

# Search specific organization's popular code
gh search code "authentication" --owner=anthropics

# Find recent code examples
gh search code "React hooks" "created:>2024-01-01"
```

### Advanced Discovery Queries

```bash
# Repos with many stars but few forks (unique ideas)
gh search repos "stars:>1000 forks:<100"

# Active repos (many recent commits)
gh search repos "pushed:>2024-10-01" --sort stars

# Find repos by file presence (e.g., has Dockerfile)
gh search code "filename:Dockerfile" --sort indexed

# Popular repos in multiple topics
gh search repos "topic:blockchain topic:typescript" --sort stars
```

## Search and Discovery

### Code Search

```bash
# Search across all repositories
gh search code "API endpoint" --language=python

# Search in specific organization
gh search code "auth" --owner=anthropics

# Exclude results with negative qualifiers
gh search issues -- "bug report -label:wontfix"
```

### Issue & PR Search

```bash
# Find open bugs
gh search issues --label=bug --state=open

# Search assigned issues
gh search issues --assignee=@me --state=open
```

For comprehensive search syntax, see [references/search.md](references/search.md)

## Special Syntax

### Field Name Inconsistencies

**IMPORTANT:** GitHub CLI uses inconsistent field names across commands:

| Field | `gh repo view` | `gh search repos` |
|-------|----------------|-------------------|
| Stars | `stargazerCount` | `stargazersCount` |
| Forks | `forkCount` | `forksCount` |

**Examples:**
```bash
# ✅ Correct for gh repo view
gh repo view owner/repo --json stargazerCount,forkCount

# ✅ Correct for gh search repos
gh search repos "query" --json stargazersCount,forksCount

# ❌ Wrong - will error
gh repo view owner/repo --json stargazersCount
```

### Excluding Search Results

When using negative qualifiers (like `-label:bug`), use `--` to prevent the hyphen from being interpreted as a flag:

**Unix/Linux/Mac:**
```bash
gh search issues -- "query -label:bug"
```

**PowerShell:**
```bash
gh --% search issues -- "query -label:bug"
```

## Reference Files

Comprehensive documentation organized by topic:

- **[search.md](references/search.md)** - Advanced search syntax for code, issues, PRs, repos
- **[repositories.md](references/repositories.md)** - Repository operations and management
- **[pull_requests.md](references/pull_requests.md)** - Pull request workflows and operations
- **[issues.md](references/issues.md)** - Issue creation and management
- **[actions.md](references/actions.md)** - GitHub Actions workflows and runs
- **[releases.md](references/releases.md)** - Release creation and management
- **[extensions.md](references/extensions.md)** - CLI extension management
- **[getting_started.md](references/getting_started.md)** - Installation and authentication setup
- **[other.md](references/other.md)** - Auth, aliases, config, additional commands

## Key Environment Variables

```bash
# Authentication token
export GH_TOKEN="your_token"

# Default repository (format: OWNER/REPO)
export GH_REPO="owner/repo"

# Disable interactive prompts for scripting
export GH_PROMPT_DISABLED=1

# Custom editor for text authoring
export GH_EDITOR="vim"
```

See [other.md](references/other.md) for complete environment variable reference.

## Resources

- Official documentation: https://cli.github.com/manual/
- GitHub CLI repository: https://github.com/cli/cli
- GitHub search syntax: https://docs.github.com/en/search-github
