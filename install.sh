#!/bin/bash
set -euo pipefail

# MorphBox Installer Script
# https://morphbox.iu.dev

MORPHBOX_VERSION="1.0.0"
MORPHBOX_HOME="${MORPHBOX_HOME:-$HOME/.morphbox}"
MORPHBOX_BIN="/usr/local/bin/morphbox"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*) echo "macos" ;;
        Linux*) echo "linux" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *) error "Unsupported operating system: $(uname -s)" ;;
    esac
}

# Check if running with proper privileges
check_privileges() {
    if [[ "$OSTYPE" != "msys" && "$OSTYPE" != "cygwin" ]]; then
        if [[ $EUID -eq 0 ]]; then
            error "This script should not be run as root. Please run as a regular user."
        fi
    fi
}

# Install Lima on macOS/Linux
install_lima() {
    local os=$1
    
    if command -v limactl &> /dev/null; then
        info "Lima is already installed"
        return
    fi
    
    info "Installing Lima..."
    
    if [[ "$os" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew install lima
        else
            error "Homebrew is required to install Lima on macOS. Please install from https://brew.sh"
        fi
    elif [[ "$os" == "linux" ]]; then
        # Install Lima from GitHub releases
        local lima_version="0.20.1"
        local arch=$(uname -m)
        case "$arch" in
            x86_64) arch="x86_64" ;;
            aarch64|arm64) arch="aarch64" ;;
            *) error "Unsupported architecture: $arch" ;;
        esac
        
        local lima_url="https://github.com/lima-vm/lima/releases/download/v${lima_version}/lima-${lima_version}-Linux-${arch}.tar.gz"
        
        info "Downloading Lima from $lima_url..."
        curl -fsSL "$lima_url" | sudo tar -xz -C /usr/local/bin limactl
        sudo chmod +x /usr/local/bin/limactl
    fi
}

# Setup WSL2 on Windows
setup_wsl() {
    info "Checking WSL2 installation..."
    
    if ! command -v wsl &> /dev/null; then
        error "WSL2 is not installed. Please install WSL2 first: https://docs.microsoft.com/en-us/windows/wsl/install"
    fi
    
    # Check if morphbox distro exists
    if wsl -l -q | grep -q "morphbox"; then
        info "MorphBox WSL distro already exists"
    else
        info "Creating MorphBox WSL distro..."
        # This would need a base image - for now we'll use Ubuntu as base
        warn "WSL setup requires manual configuration. Please follow the README for WSL setup instructions."
    fi
}

# Download MorphBox files
download_morphbox_files() {
    info "Creating MorphBox directory at $MORPHBOX_HOME..."
    mkdir -p "$MORPHBOX_HOME"
    
    local files=("morphbox" "claude-vm.yaml" "firewall.sh" "allowed.txt")
    local base_url="https://raw.githubusercontent.com/morphbox/morphbox/main"
    
    for file in "${files[@]}"; do
        info "Downloading $file..."
        curl -fsSL "$base_url/$file" -o "$MORPHBOX_HOME/$file"
    done
    
    # Make scripts executable
    chmod +x "$MORPHBOX_HOME/morphbox"
    chmod +x "$MORPHBOX_HOME/firewall.sh"
}

# Install morphbox CLI
install_morphbox_cli() {
    info "Installing morphbox CLI to $MORPHBOX_BIN..."
    
    # Create symlink to morphbox script
    sudo ln -sf "$MORPHBOX_HOME/morphbox" "$MORPHBOX_BIN"
    
    info "MorphBox CLI installed successfully!"
}

# Main installation
main() {
    echo "🚀 MorphBox Installer v${MORPHBOX_VERSION}"
    echo "=================================="
    
    check_privileges
    
    local os=$(detect_os)
    info "Detected OS: $os"
    
    case "$os" in
        macos|linux)
            install_lima "$os"
            ;;
        windows)
            setup_wsl
            ;;
    esac
    
    download_morphbox_files
    install_morphbox_cli
    
    echo ""
    echo "✅ MorphBox installed successfully!"
    echo ""
    echo "To get started, run:"
    echo "  morphbox --help"
    echo ""
    echo "First run may take up to 3 minutes to download and configure the VM."
    echo "Subsequent runs will start in under 10 seconds."
    echo ""
}

main "$@"