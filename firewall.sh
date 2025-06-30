#!/bin/bash
# MorphBox Firewall Configuration
# Blocks all outbound traffic except to allowed domains

set -euo pipefail

# Path to allowed domains file
ALLOWED_FILE="/workspace/allowed.txt"
MORPHBOX_HOME="${MORPHBOX_HOME:-/home/morphbox/.morphbox}"

# Use the allowed.txt from the morphbox installation if workspace file doesn't exist
if [[ ! -f "$ALLOWED_FILE" && -f "$MORPHBOX_HOME/allowed.txt" ]]; then
    ALLOWED_FILE="$MORPHBOX_HOME/allowed.txt"
fi

# Default allowed domains if file doesn't exist
DEFAULT_ALLOWED_DOMAINS=(
    "api.anthropic.com"
    "api.openai.com"
    "api.gemini.google.com"
    "openrouter.ai"
    "registry.npmjs.org"
    "github.com"
    "iu.dev"
)

echo "Configuring MorphBox firewall..."

# Flush existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# Default policies
iptables -P INPUT ACCEPT
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow DNS queries (needed for domain resolution)
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# Function to resolve domain to IPs and add rules
allow_domain() {
    local domain=$1
    echo "  Allowing: $domain"
    
    # Resolve domain to IPs
    local ips=$(dig +short "$domain" 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' || true)
    
    if [[ -z "$ips" ]]; then
        # Try with host command as fallback
        ips=$(host "$domain" 2>/dev/null | grep "has address" | awk '{print $4}' || true)
    fi
    
    if [[ -n "$ips" ]]; then
        for ip in $ips; do
            iptables -A OUTPUT -d "$ip" -p tcp --dport 443 -j ACCEPT
            iptables -A OUTPUT -d "$ip" -p tcp --dport 80 -j ACCEPT
        done
    else
        echo "    Warning: Could not resolve $domain"
    fi
    
    # Also allow by domain name using string matching (requires iptables string module)
    if lsmod | grep -q xt_string; then
        iptables -A OUTPUT -p tcp --dport 443 -m string --string "$domain" --algo bm -j ACCEPT
        iptables -A OUTPUT -p tcp --dport 80 -m string --string "$domain" --algo bm -j ACCEPT
    fi
}

# Read allowed domains
echo "Reading allowed domains..."

if [[ -f "$ALLOWED_FILE" ]]; then
    # Read from file
    while IFS= read -r domain; do
        # Skip empty lines and comments
        [[ -z "$domain" || "$domain" =~ ^[[:space:]]*# ]] && continue
        # Trim whitespace
        domain=$(echo "$domain" | xargs)
        allow_domain "$domain"
    done < "$ALLOWED_FILE"
else
    # Use default domains
    echo "  Using default allowed domains..."
    for domain in "${DEFAULT_ALLOWED_DOMAINS[@]}"; do
        allow_domain "$domain"
    done
fi

# Allow HTTPS to package registries (npm, pip, etc)
# PyPI
allow_domain "pypi.org"
allow_domain "files.pythonhosted.org"

# Node.js
allow_domain "nodejs.org"

# Ubuntu/Debian package updates (optional, can be commented out for stricter isolation)
# allow_domain "archive.ubuntu.com"
# allow_domain "security.ubuntu.com"

# Log dropped packets (optional, for debugging)
# iptables -A OUTPUT -j LOG --log-prefix "MorphBox-Dropped: " --log-level 4

# Save rules (Ubuntu/Debian)
if command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
fi

echo "Firewall configuration complete!"
echo ""
echo "Allowed domains:"
if [[ -f "$ALLOWED_FILE" ]]; then
    cat "$ALLOWED_FILE" | grep -v '^#' | grep -v '^[[:space:]]*$'
else
    printf '%s\n' "${DEFAULT_ALLOWED_DOMAINS[@]}"
fi
echo ""
echo "All other outbound traffic is blocked."