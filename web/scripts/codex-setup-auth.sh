#!/bin/bash

################################################################################
# OpenAI Codex CLI Authentication Setup Script for MorphBox
#
# This script helps set up OpenAI Codex CLI authentication inside the
# MorphBox Docker container by copying auth.json from the host to the container.
#
# Usage:
#   ./codex-setup-auth.sh [path/to/auth.json]
#
# If no path is provided, the script looks for:
#   1. scripts/codex-auth.json (default location)
#   2. ~/.codex/auth.json (user's local Codex auth)
#
# Prerequisites:
#   - Docker container 'morphbox-vm' must be running
#   - auth.json file must exist (obtained via 'codex login' on local machine)
#
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Container name
CONTAINER_NAME="morphbox-vm"

# Default auth.json locations to check
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_AUTH_FILE="${SCRIPT_DIR}/codex-auth.json"
USER_AUTH_FILE="${HOME}/.codex/auth.json"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  MorphBox Codex Authentication Setup${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

################################################################################
# Main Script
################################################################################

print_header

# Check if container is running
print_info "Checking if Docker container '${CONTAINER_NAME}' is running..."
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    print_error "Container '${CONTAINER_NAME}' is not running"
    echo ""
    echo "Please start MorphBox first:"
    echo "  docker start ${CONTAINER_NAME}"
    echo ""
    exit 1
fi
print_success "Container is running"

# Determine auth.json file location
AUTH_FILE=""
if [ $# -eq 1 ]; then
    # Use provided path
    AUTH_FILE="$1"
    print_info "Using provided auth.json: ${AUTH_FILE}"
elif [ -f "${DEFAULT_AUTH_FILE}" ]; then
    # Use default location in scripts/
    AUTH_FILE="${DEFAULT_AUTH_FILE}"
    print_info "Using default auth.json: ${AUTH_FILE}"
elif [ -f "${USER_AUTH_FILE}" ]; then
    # Use user's local Codex auth
    AUTH_FILE="${USER_AUTH_FILE}"
    print_info "Using your local Codex auth: ${AUTH_FILE}"
else
    print_error "Could not find auth.json file"
    echo ""
    echo "Please provide auth.json in one of these ways:"
    echo ""
    echo "1. Copy your local auth.json to the scripts directory:"
    echo "   cp ~/.codex/auth.json ${DEFAULT_AUTH_FILE}"
    echo "   ./codex-setup-auth.sh"
    echo ""
    echo "2. Specify the path directly:"
    echo "   ./codex-setup-auth.sh /path/to/auth.json"
    echo ""
    echo "To get auth.json, run 'codex login' on your local machine first."
    echo ""
    exit 1
fi

# Verify auth.json file exists and is readable
if [ ! -f "${AUTH_FILE}" ]; then
    print_error "File not found: ${AUTH_FILE}"
    exit 1
fi

if [ ! -r "${AUTH_FILE}" ]; then
    print_error "File is not readable: ${AUTH_FILE}"
    exit 1
fi

print_success "Found auth.json file"

# Validate auth.json format (basic check)
print_info "Validating auth.json format..."
if ! grep -q "access_token\|refresh_token" "${AUTH_FILE}"; then
    print_warning "auth.json may not be valid (no access_token or refresh_token found)"
    print_info "Continuing anyway..."
else
    print_success "auth.json format looks valid"
fi

# Create .codex directory in container
print_info "Creating .codex directory in container..."
docker exec "${CONTAINER_NAME}" mkdir -p /root/.codex
print_success "Directory created"

# Copy auth.json to container
print_info "Copying auth.json to container..."
docker cp "${AUTH_FILE}" "${CONTAINER_NAME}:/root/.codex/auth.json"
print_success "auth.json copied"

# Set proper permissions
print_info "Setting permissions..."
docker exec "${CONTAINER_NAME}" chmod 600 /root/.codex/auth.json
docker exec "${CONTAINER_NAME}" chown root:root /root/.codex/auth.json
print_success "Permissions set"

# Verify the file exists in container
print_info "Verifying installation..."
if docker exec "${CONTAINER_NAME}" test -f /root/.codex/auth.json; then
    print_success "auth.json successfully installed in container"
else
    print_error "Verification failed - file not found in container"
    exit 1
fi

# Optional: Check if codex CLI is installed
print_info "Checking if Codex CLI is installed in container..."
if docker exec "${CONTAINER_NAME}" which codex >/dev/null 2>&1; then
    print_success "Codex CLI is installed"

    # Try to verify authentication works
    print_info "Testing Codex authentication..."
    if docker exec "${CONTAINER_NAME}" codex whoami >/dev/null 2>&1; then
        print_success "Authentication verified - Codex is ready to use!"
    else
        print_warning "Authentication test failed, but auth.json is installed"
        print_info "You may need to refresh tokens by running 'codex login' again"
    fi
else
    print_warning "Codex CLI is not installed in container"
    echo ""
    echo "To install Codex CLI in the container:"
    echo "  docker exec -it ${CONTAINER_NAME} bash"
    echo "  npm install -g @openai/codex-cli"
    echo ""
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "You can now use Codex CLI in MorphBox terminals."
echo ""
echo "Try it:"
echo "  docker exec -it ${CONTAINER_NAME} bash"
echo "  codex chat \"Hello, what is 2+2?\""
echo ""
echo "For more information, see:"
echo "  docs/CODEX_AUTHENTICATION.md"
echo ""
