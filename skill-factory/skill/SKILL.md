---
name: skill-factory
description: Autonomous skill creation agent that analyzes requests, automatically selects the best creation method (documentation scraping via Skill_Seekers, manual TDD construction, or hybrid), ensures quality compliance with Anthropic best practices, and delivers production-ready skills without requiring user decision-making or navigation
when_to_use: when you need to create any Claude skill and want it done automatically with guaranteed quality - works for documentation-based skills, GitHub repositories, PDFs, custom workflows, or hybrid approaches
version: 0.0.0
---

# Skill Factory

**Autonomous skill creation - just tell me what you need, I'll handle everything.**

## What This Does

You request a skill, I deliver a production-ready skill with guaranteed quality (score >= 8.0/10).

**No decision-making required. No tool selection. No quality checking. Just results.**

## Usage

Simply describe the skill you need:

```
"Create a skill for Anchor development with latest docs and best practices"
"Create a React skill from react.dev with comprehensive examples"
"Create a skill for Solana transaction debugging workflows"
"Create a skill for writing technical documentation following company standards"
```

**I will automatically:**
1. ✅ Analyze your request
2. ✅ Select the optimal creation method
3. ✅ Create the skill
4. ✅ Run quality assurance loops (until score >= 8.0)
5. ✅ Test with automated scenarios
6. ✅ Deliver ready-to-use skill with stats

## What You Get

```
✅ anchor-development skill ready!

📊 Quality Score: 8.9/10 (Excellent)
📝 Lines: 412 (using progressive disclosure)
📚 Coverage: 247 documentation pages
💡 Examples: 68 code samples
🧪 Test Pass Rate: 100% (15/15 scenarios)

📁 Location: ~/.claude/skills/anchor-development/
📦 Zip: ~/Downloads/anchor-development.zip

Try it: "How do I create an Anchor program?"
```

## How It Works (Behind the Scenes)

### Phase 1: Request Analysis (Automatic)

I analyze your request to determine:

**Source Detection:**
- Documentation URL/mention? → Automated scraping path
- "Latest docs", "current version"? → Automated path
- GitHub repository mention? → Automated path
- PDF/manual path? → Automated path
- Custom workflow/process description? → Manual TDD path
- Both documentation AND custom needs? → Hybrid path

**Quality Requirements Extraction:**
- "Best practices" → Enforce quality gates
- "Latest version" → Scrape current docs
- "Examples" → Ensure code samples included
- "Comprehensive" → Verify coverage completeness

### Phase 2: Execution (Automatic)

**Path A: Documentation-Based (Skill_Seekers)**
```
Detected: Documentation source available
Method: Automated scraping with quality enhancement

Steps I take:
1. Check Skill_Seekers installation (install if needed)
2. Configure scraping parameters automatically
3. Run scraping with optimal settings
4. Monitor progress
5. Initial quality check
6. If score < 8.0: Run enhancement loop
7. Re-score until >= 8.0
8. Test with auto-generated scenarios
9. Package and deliver
```

**Path B: Custom Workflows (Manual TDD)**
```
Detected: Custom workflow/process
Method: Test-Driven Documentation (obra methodology)

Steps I take:
1. Create pressure test scenarios
2. Run baseline (without skill)
3. Document agent behavior
4. Write minimal skill addressing baseline
5. Test with skill present
6. Identify rationalizations/gaps
7. Close loopholes
8. Iterate until bulletproof
9. Package and deliver
```

**Path C: Hybrid**
```
Detected: Documentation + custom requirements
Method: Scrape then enhance

Steps I take:
1. Scrape documentation (Path A)
2. Identify gaps vs requirements
3. Fill gaps with TDD approach (Path B)
4. Unify and test as whole
5. Quality loop until >= 8.0
6. Package and deliver
```

### Phase 3: Quality Assurance Loop (Automatic)

**I enforce Anthropic best practices:**

```python
while quality_score < 8.0:
    issues = analyze_against_anthropic_guidelines(skill)

    if "vague_description" in issues:
        improve_description_specificity()

    if "missing_examples" in issues:
        extract_or_generate_examples()

    if "too_long" in issues:
        apply_progressive_disclosure()

    if "poor_structure" in issues:
        reorganize_content()

    quality_score = rescore()
```

**Quality Criteria (Anthropic Best Practices):**
- ✅ Description: Specific, clear, includes when_to_use
- ✅ Conciseness: <500 lines OR progressive disclosure
- ✅ Examples: Concrete code samples, not abstract
- ✅ Structure: Well-organized, clear sections
- ✅ Name: Follows conventions (lowercase, hyphens, descriptive)

### Phase 4: Testing (Automatic)

**I generate and run test scenarios:**

```python
# Auto-generate test cases from skill content
test_cases = extract_key_topics(skill)

for topic in test_cases:
    query = f"How do I {topic}?"

    # Test WITHOUT skill (baseline)
    baseline = run_query_without_skill(query)

    # Test WITH skill
    with_skill = run_query_with_skill(query)

    # Verify improvement
    if not is_better(with_skill, baseline):
        identify_gap()
        enhance_skill()
        retest()
```

### Phase 5: Delivery (Automatic)

```
Package skill:
- Create skill directory structure
- Generate SKILL.md with frontmatter
- Create reference files (if using progressive disclosure)
- Add examples directory
- Create .zip for easy upload
- Install to ~/.claude/skills/ (if desired)
- Generate summary statistics
```

## Progress Reporting

You'll see real-time progress:

```
🔍 Analyzing request...
   ✅ Detected: Documentation-based (docs.rs/anchor-lang)
   ✅ Requirements: Latest version, best practices, examples

🔄 Creating skill...
   📥 Scraping docs.rs/anchor-lang... (2 min)
   📚 Extracting 247 pages...
   💾 Organizing content...

📊 Quality check: 7.4/10
   ⚠️  Issues found:
       - Description too generic (fixing...)
       - Missing examples in 4 sections (adding...)
       - Some outdated patterns (updating...)

🔧 Enhancing skill...
   ✏️  Description improved
   📝 Examples added
   🔄 Patterns updated

📊 Quality check: 8.9/10 ✅

🧪 Testing...
   ✅ 15/15 scenarios passing

✅ anchor-development skill ready!
```

## Dependencies

**Required:**
- Python 3.10+ (for quality scripts)
- bash (for automation scripts)

**Optional (auto-installed when needed):**
- Skill_Seekers (for documentation scraping)
  - Will prompt for installation on first documentation-based request
  - One-command setup: `scripts/install-skill-seekers.sh`

## Configuration

**Environment variables (optional):**

```bash
# Skill_Seekers installation path
export SKILL_SEEKERS_PATH="$HOME/Skill_Seekers"

# Output directory for created skills
export SKILL_OUTPUT_DIR="$HOME/.claude/skills"

# Minimum quality score (default: 8.0)
export MIN_QUALITY_SCORE="8.0"

# Auto-install dependencies (default: prompt)
export AUTO_INSTALL_DEPS="true"
```

## Examples

**Example 1: Documentation Skill**
```
User: "Create a React skill from react.dev"

Agent:
🔍 Analyzing... → Documentation-based
🔄 Scraping react.dev... → 3 min
📊 Quality: 7.8 → 8.6 ✅
🧪 Testing: 12/12 passing ✅
✅ react-development skill ready (8.6/10)
```

**Example 2: Custom Workflow Skill**
```
User: "Create a skill for debugging Solana transaction failures"

Agent:
🔍 Analyzing... → Custom workflow (no docs to scrape)
📝 Using TDD methodology...
🧪 RED: Testing baseline...
✏️  GREEN: Writing skill...
🔄 REFACTOR: Closing loopholes...
📊 Quality: 8.3 ✅
✅ solana-transaction-debugging skill ready (8.3/10)
```

**Example 3: Hybrid Skill**
```
User: "Create an Anchor skill with docs plus custom debugging workflows"

Agent:
🔍 Analyzing... → Hybrid (docs + custom)
📥 Scraping docs.rs/anchor-lang... → 2 min
📝 Adding custom debugging workflows...
🔄 Integrating and testing...
📊 Quality: 8.9 ✅
✅ anchor-development skill ready (8.9/10)
```

## Quality Guarantee

**Every skill delivered by skill-factory:**
- ✅ Scores >= 8.0/10 on Anthropic best practices
- ✅ Has concrete examples (not abstract)
- ✅ Follows structure conventions
- ✅ Tested with auto-generated scenarios
- ✅ Ready to use immediately

**If quality < 8.0, I keep working until it reaches 8.0+**

## Troubleshooting

**Skill_Seekers installation fails:**
```bash
# Manual installation
git clone https://github.com/yusufkaraaslan/Skill_Seekers ~/Skill_Seekers
cd ~/Skill_Seekers
pip install -r requirements.txt

# Or use installation script
~/Projects/claude-skills/skill-factory/skill/scripts/install-skill-seekers.sh
```

**Quality score stuck below 8.0:**
- I'll report what's blocking and suggest manual review
- Check references/anthropic-best-practices.md for criteria
- Run manual enhancement if needed

**Want to understand methodology:**
- See references/obra-tdd-methodology.md (testing approach)
- See references/anthropic-best-practices.md (quality criteria)
- See references/skill-seekers-integration.md (automation details)

## Reference Files

For deep understanding (optional reading):
- references/obra-tdd-methodology.md - Full TDD testing approach
- references/anthropic-best-practices.md - Complete quality guidelines
- references/skill-seekers-integration.md - Automation documentation
- references/request-analysis.md - How requests are parsed
- references/quality-loops.md - Enhancement algorithms

## Scripts Reference

Available helper scripts in `scripts/` directory:
- **check-skill-seekers.sh** - Check if Skill_Seekers is installed
- **install-skill-seekers.sh** - One-command Skill_Seekers setup
- **quality-check.py** - Score any skill against Anthropic best practices

Usage examples:
```bash
# Check Skill_Seekers installation
./scripts/check-skill-seekers.sh

# Install Skill_Seekers
./scripts/install-skill-seekers.sh

# Quality check a skill
python3 ./scripts/quality-check.py /path/to/skill/SKILL.md
```

## Philosophy

**You don't want to:**
- Navigate decision trees
- Choose between tools
- Check quality manually
- Test with subagents yourself
- Wonder if output is good

**You want to:**
- Describe what you need
- Get high-quality result
- Start using immediately

**That's what skill-factory delivers.**

## Credits

Built on top of excellent tools:
- [Skill_Seekers](https://github.com/yusufkaraaslan/Skill_Seekers) - Documentation scraping
- [obra/superpowers-skills](https://github.com/obra/superpowers-skills) - TDD methodology
- [Anthropic skill-creator](https://github.com/anthropics/skills) - Best practices

Skill-factory orchestrates these tools with automatic quality assurance and testing.

---

**Just tell me what skill you need. I'll handle the rest.**
