# MorphBox Docker Container
FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies (without nodejs/npm initially)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    sudo \
    openssh-server \
    && rm -rf /var/lib/apt/lists/*

# Remove any existing Node.js and install Node.js 20
RUN apt-get update && \
    apt-get remove -y nodejs npm libnode-dev && \
    apt-get autoremove -y && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install Claude CLI
RUN npm install -g claude-code

# Create morphbox user
RUN useradd -m -s /bin/bash morphbox && \
    echo 'morphbox:morphbox' | chpasswd && \
    usermod -aG sudo morphbox && \
    echo "morphbox ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/morphbox

# Setup SSH
RUN mkdir /var/run/sshd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config

# Create workspace
RUN mkdir -p /workspace && chown morphbox:morphbox /workspace

# Set working directory
WORKDIR /workspace

# Switch to morphbox user
USER morphbox

# Set up SSH keys for passwordless login
RUN mkdir -p ~/.ssh && chmod 700 ~/.ssh

# Entry point
USER root
EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]