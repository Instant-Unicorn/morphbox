# MorphBox Docker Container - Multi-AI CLI Development Environment
# Includes Claude, Gemini, and Codex CLI tools
FROM node:20

# Cache-optimized layer: System packages (rarely changes)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    sudo \
    openssh-server \
    iptables \
    ipset \
    iproute2 \
    dnsutils \
    tmux \
    && rm -rf /var/lib/apt/lists/*

# Create morphbox user with proper permissions
# No password required - security through network isolation
RUN useradd -m -s /bin/bash morphbox && \
    usermod -aG sudo morphbox && \
    # Allow sudo without password for convenience in isolated container
    echo "morphbox ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/morphbox && \
    # Set empty password for morphbox user (for SSH)
    passwd -d morphbox

# Give morphbox user ownership of npm directories for AI CLI updates
RUN chown -R morphbox:morphbox /usr/local/lib/node_modules /usr/local/bin /usr/local/share

# AI CLI tools layer - install placeholder for first-run installation
# Tools will be installed/updated on container start via entrypoint
USER morphbox
WORKDIR /home/morphbox

# Note: Tools may not exist yet, container will auto-install on first run
RUN echo "Preparing environment for AI CLI tools..." && \
    npm install -g npm@latest 2>/dev/null || true && \
    echo "NPM updated to latest version"

USER root

# Setup SSH for container access - passwordless for local container
RUN mkdir /var/run/sshd && \
    # Disable root login
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config && \
    # Enable empty passwords for local container access
    sed -i 's/#PermitEmptyPasswords no/PermitEmptyPasswords yes/' /etc/ssh/sshd_config && \
    # Ensure PermitEmptyPasswords is set even if pattern doesn't match
    grep -q "^PermitEmptyPasswords yes" /etc/ssh/sshd_config || echo "PermitEmptyPasswords yes" >> /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    echo "MaxSessions 10" >> /etc/ssh/sshd_config && \
    echo "AcceptEnv TERM COLORTERM" >> /etc/ssh/sshd_config && \
    # Ensure morphbox user has no password (fix for Docker image layer caching)
    passwd -d morphbox || true

# Create workspace directory
RUN mkdir -p /workspace && chown morphbox:morphbox /workspace

# Set working directory
WORKDIR /workspace

# Switch to morphbox user for security
USER morphbox

# Create directories for AI tools configuration and set terminal in profile
RUN mkdir -p ~/.config/claude-code && \
    mkdir -p ~/.config/gemini-cli && \
    mkdir -p ~/.config/codex && \
    echo 'export TERM=xterm-256color' >> ~/.bashrc && \
    echo 'export COLORTERM=truecolor' >> ~/.bashrc && \
    echo 'alias claude-update="npm update -g @anthropic-ai/claude-code && echo \"Claude updated to version \$(claude --version)\""' >> ~/.bashrc && \
    echo 'alias gemini-update="npm update -g @google/gemini-cli && echo \"Gemini updated to version \$(gemini --version)\""' >> ~/.bashrc && \
    echo 'alias codex-update="npm update -g @openai/codex && echo \"Codex updated to version \$(codex --version)\""' >> ~/.bashrc && \
    echo 'alias ai-update="claude-update && gemini-update && codex-update"' >> ~/.bashrc

# Switch back to root for SSH daemon
USER root

# Set proper terminal environment
ENV TERM=xterm-256color
ENV COLORTERM=truecolor

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 22

ENTRYPOINT ["/docker-entrypoint.sh"]