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
    else
        info "Lima needs to be installed"
    fi
    
    # Check for QEMU on Linux
    if [[ "$os" == "linux" ]]; then
        if ! command -v qemu-img &> /dev/null; then
            error "QEMU is required for Lima on Linux. Please install it first:"
            error "  sudo apt-get install -y qemu-system-x86 qemu-utils"
            error "  # or for other distros:"
            error "  sudo dnf install qemu"
            error "  sudo pacman -S qemu"
            exit 1
        fi
    fi
    
    if command -v limactl &> /dev/null; then
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
        # Download to temp directory first
        local temp_dir=$(mktemp -d)
        
        # Download and extract with proper path stripping
        info "Extracting Lima files..."
        curl -fsSL "$lima_url" | tar -xz -C "$temp_dir" --strip-components=1
        
        # Copy binaries
        if [[ -d "$temp_dir/bin" ]]; then
            info "Installing Lima binaries..."
            sudo mkdir -p /usr/local/bin
            sudo cp -v "$temp_dir/bin/"* /usr/local/bin/
            sudo chmod +x /usr/local/bin/lima*
        else
            error "Could not find bin directory in Lima archive"
        fi
        
        # Copy share files (including guest agent)
        if [[ -d "$temp_dir/share/lima" ]]; then
            info "Installing Lima support files..."
            sudo mkdir -p /usr/local/share/lima
            # Copy files (not directories)
            sudo find "$temp_dir/share/lima" -maxdepth 1 -type f -exec cp -v {} /usr/local/share/lima/ \;
            # Copy subdirectories recursively
            for dir in "$temp_dir/share/lima"/*; do
                if [[ -d "$dir" ]]; then
                    sudo cp -rv "$dir" /usr/local/share/lima/
                fi
            done
            sudo chmod +x /usr/local/share/lima/lima-guestagent*
        else
            error "Could not find share/lima directory in archive"
        fi
        
        # Verify installation
        if [[ ! -f "/usr/local/share/lima/lima-guestagent.Linux-${arch}" ]]; then
            error "Lima guest agent not found after installation!"
        else
            info "Lima installed successfully"
        fi
        
        rm -rf "$temp_dir"
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

# Copy MorphBox files
copy_morphbox_files() {
    info "Creating MorphBox directory at $MORPHBOX_HOME..."
    mkdir -p "$MORPHBOX_HOME"
    
    local files=("morphbox" "claude-vm.yaml" "firewall.sh" "allowed.txt")
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    for file in "${files[@]}"; do
        if [[ -f "$script_dir/$file" ]]; then
            info "Copying $file..."
            cp "$script_dir/$file" "$MORPHBOX_HOME/$file"
        else
            error "Required file not found: $script_dir/$file"
        fi
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
    
    copy_morphbox_files
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