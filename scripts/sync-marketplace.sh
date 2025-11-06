#!/bin/bash
set -e

cd "$(dirname "$0")/.."
MARKETPLACE=".claude-plugin/marketplace.json"

echo "Syncing plugin versions to marketplace.json..."
echo ""

# Read marketplace and update each plugin version from the plugin's package.json
jq -c '.plugins[]' "$MARKETPLACE" | while read -r plugin; do
  name=$(echo "$plugin" | jq -r '.name')

  # Plugin package.json is at ./<plugin-name>/package.json
  package_json="./${name}/package.json"

  if [ -f "$package_json" ]; then
    version=$(jq -r '.version' "$package_json")
    current_version=$(echo "$plugin" | jq -r '.version')

    if [ "$version" != "$current_version" ]; then
      echo "  $name: $current_version → $version"
      jq --arg name "$name" --arg ver "$version" \
        '(.plugins[] | select(.name == $name) | .version) = $ver' \
        "$MARKETPLACE" > "${MARKETPLACE}.tmp"
      mv "${MARKETPLACE}.tmp" "$MARKETPLACE"
    else
      echo "  $name: $version (unchanged)"
    fi
  else
    echo "  ✗ Error: $package_json not found for plugin '$name'"
    exit 1
  fi
done

echo ""
echo "✓ Marketplace sync complete!"
