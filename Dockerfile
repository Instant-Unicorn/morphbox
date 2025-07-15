# MorphBox Docker Container - Based on official Claude-Code devcontainer
FROM node:20

# Install minimal required packages (matching Claude-Code devcontainer)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    sudo \
    openssh-server \
    iptables \
    ipset \
    iproute2 \
    dnsutils \
    && rm -rf /var/lib/apt/lists/*

# Install Claude CLI (official package)
RUN npm install -g @anthropic-ai/claude-code

# Create morphbox user with proper permissions
RUN useradd -m -s /bin/bash morphbox && \
    echo 'morphbox:morphbox' | chpasswd && \
    usermod -aG sudo morphbox && \
    echo "morphbox ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/morphbox

# Setup SSH for container access
RUN mkdir /var/run/sshd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config

# Create workspace directory
RUN mkdir -p /workspace && chown morphbox:morphbox /workspace

# Set working directory
WORKDIR /workspace

# Switch to morphbox user for security
USER morphbox

# Create directories for Claude configuration
RUN mkdir -p ~/.config/claude-code

# Switch back to root for SSH daemon
USER root

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]