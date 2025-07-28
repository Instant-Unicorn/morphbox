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

# Create morphbox user with proper permissions first
RUN useradd -m -s /bin/bash morphbox && \
    echo 'morphbox:morphbox' | chpasswd && \
    usermod -aG sudo morphbox && \
    echo "morphbox ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/morphbox

# Give morphbox user ownership of npm directories for Claude updates
RUN chown -R morphbox:morphbox /usr/local/lib/node_modules /usr/local/bin /usr/local/share

# Install Claude CLI as morphbox user to enable auto-updates
USER morphbox
RUN npm install -g @anthropic-ai/claude-code
USER root

# Setup SSH for container access
RUN mkdir /var/run/sshd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    echo "AcceptEnv TERM COLORTERM" >> /etc/ssh/sshd_config

# Create workspace directory
RUN mkdir -p /workspace && chown morphbox:morphbox /workspace

# Set working directory
WORKDIR /workspace

# Switch to morphbox user for security
USER morphbox

# Create directories for Claude configuration and set terminal in profile
RUN mkdir -p ~/.config/claude-code && \
    echo 'export TERM=xterm-256color' >> ~/.bashrc && \
    echo 'export COLORTERM=truecolor' >> ~/.bashrc && \
    echo 'alias claude-update="npm update -g @anthropic-ai/claude-code && echo \"Claude updated to version \$(claude --version)\""' >> ~/.bashrc

# Switch back to root for SSH daemon
USER root

# Set proper terminal environment
ENV TERM=xterm-256color
ENV COLORTERM=truecolor

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]