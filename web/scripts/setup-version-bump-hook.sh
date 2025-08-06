#!/bin/bash

# Script to set up git post-merge hook for automatic version bumping

set -e

echo "Setting up automatic version bump for git merges..."

# Navigate to the web directory
cd "$(dirname "$0")/.."

# Create .git/hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create the post-merge hook
cat > .git/hooks/post-merge << 'EOF'
#!/bin/bash

# Git post-merge hook to automatically increment version after merge

set -e

echo "Running post-merge version bump..."

# Function to increment version
increment_version() {
    local version=$1
    local major=$(echo $version | cut -d. -f1)
    local minor=$(echo $version | cut -d. -f2)
    local patch=$(echo $version | cut -d. -f3)
    
    # Increment patch version by 1
    patch=$((patch + 1))
    
    echo "${major}.${minor}.${patch}"
}

# Get current version from package.json
current_version=$(node -p "require('./package.json').version")
echo "Current version: $current_version"

# Increment version
new_version=$(increment_version "$current_version")
echo "Incrementing version to: $new_version"

# Update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
pkg.version = '$new_version';
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update package-lock.json if it exists
if [ -f "package-lock.json" ]; then
    npm install --package-lock-only --silent
fi

# Stage the changes
git add package.json
[ -f "package-lock.json" ] && git add package-lock.json

# Update CHANGELOG
changelog_file="../docs/CHANGELOG.md"
if [ -f "$changelog_file" ]; then
    current_date=$(date +%Y-%m-%d)
    temp_file=$(mktemp)
    
    # Check if we need to add today's date
    if ! grep -q "## $current_date" "$changelog_file"; then
        # Create new date entry
        {
            echo "# MorphBox Changelog"
            echo ""
            echo "## $current_date"
            echo ""
            echo "### Version $new_version - Post-merge version bump"
            echo ""
            echo "**Automated Changes**:"
            echo "- Version automatically incremented from $current_version to $new_version after merge"
            echo ""
            tail -n +2 "$changelog_file"
        } > "$temp_file"
    else
        # Add to existing date entry
        awk -v date="## $current_date" -v content="### Version $new_version - Post-merge version bump\n\n**Automated Changes**:\n- Version automatically incremented from $current_version to $new_version after merge\n" '
        $0 ~ date { print; print ""; print content; next }
        { print }
        ' "$changelog_file" > "$temp_file"
    fi
    
    mv "$temp_file" "$changelog_file"
    git add "$changelog_file"
fi

# Create a commit for the version bump
git commit -m "chore: Bump version to $new_version after merge

Automated version increment by git post-merge hook" || echo "No changes to commit"

echo "✅ Version bumped to $new_version"
EOF

# Make the hook executable
chmod +x .git/hooks/post-merge

echo "✅ Git post-merge hook installed successfully!"
echo ""
echo "The version will now automatically increment by 0.0.1 after every git merge."
echo ""
echo "To test the hook, you can run:"
echo "  git pull origin main"
echo ""
echo "To disable the hook, run:"
echo "  rm .git/hooks/post-merge"