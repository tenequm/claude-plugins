#!/usr/bin/env bash
set -e

# Validate all skills in the repository
# Runs quick_validate.py on each skill directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
VALIDATOR="$REPO_ROOT/.claude/skills/skill-creator/scripts/quick_validate.py"

if [ ! -f "$VALIDATOR" ]; then
    echo "❌ Validator not found: $VALIDATOR"
    exit 1
fi

# Find skill directories (exclude .claude, .git, scripts, .github)
SKILLS=$(find "$REPO_ROOT" -mindepth 1 -maxdepth 1 -type d \
    ! -name ".*" \
    ! -name "scripts" \
    ! -name "__pycache__")

if [ -z "$SKILLS" ]; then
    echo "No skills found to validate"
    exit 0
fi

echo "🔍 Validating skills..."
FAILED=0

for skill in $SKILLS; do
    skill_name=$(basename "$skill")

    # Check if it has SKILL.md (basic skill directory check)
    if [ ! -f "$skill/SKILL.md" ]; then
        echo "⏭️  Skipping $skill_name (no SKILL.md)"
        continue
    fi

    echo "   Checking $skill_name..."
    if ! python3 "$VALIDATOR" "$skill" 2>&1; then
        echo "   ❌ $skill_name validation failed"
        FAILED=1
    else
        echo "   ✅ $skill_name"
    fi
done

if [ $FAILED -eq 1 ]; then
    echo ""
    echo "❌ Some skills failed validation"
    exit 1
fi

echo ""
echo "✅ All skills validated successfully"
exit 0
