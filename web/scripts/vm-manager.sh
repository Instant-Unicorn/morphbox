#!/bin/bash
set -euo pipefail

# MorphBox VM Manager - Handles Docker container lifecycle and Claude authentication

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONTAINER_NAME="morphbox-vm"

# Check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running or permission denied"
        exit 1
    fi
}

# Get the correct Docker Compose command
get_docker_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    elif docker compose version &> /dev/null; then
        echo "docker compose"
    else
        error "Docker Compose is not available"
        exit 1
    fi
}

# Check if container is running
is_container_running() {
    docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"
}

# Check if container exists (running or stopped)
container_exists() {
    docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"
}

# Start the MorphBox VM
start_vm() {
    info "Starting MorphBox VM..."
    
    cd "$PROJECT_DIR"
    
    if is_container_running; then
        info "MorphBox VM is already running"
        return 0
    fi
    
    if container_exists; then
        info "Starting existing container..."
        docker start "$CONTAINER_NAME"
    else
        info "Creating and starting new container..."
        local compose_cmd=$(get_docker_compose_cmd)
        $compose_cmd up -d morphbox-vm
    fi
    
    # Wait for container to be fully ready
    info "Waiting for container services to start..."
    local max_attempts=15
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec morphbox-vm ps aux | grep -q sshd && docker exec morphbox-vm claude --version >/dev/null 2>&1; then
            info "Container services are ready"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "Container services failed to start after $max_attempts attempts"
            return 1
        fi
        
        echo -n "."
        sleep 1
        ((attempt++))
    done
    
    info "MorphBox VM started successfully"
}

# Stop the MorphBox VM
stop_vm() {
    info "Stopping MorphBox VM..."
    
    if ! is_container_running; then
        info "MorphBox VM is not running"
        return 0
    fi
    
    docker stop "$CONTAINER_NAME"
    info "MorphBox VM stopped"
}

# Restart the MorphBox VM
restart_vm() {
    info "Restarting MorphBox VM..."
    stop_vm
    start_vm
}

# Remove the MorphBox VM (this will lose authentication!)
remove_vm() {
    warn "⚠️  This will remove the container and lose Claude authentication!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Cancelled"
        return 0
    fi
    
    info "Removing MorphBox VM..."
    
    if is_container_running; then
        docker stop "$CONTAINER_NAME"
    fi
    
    if container_exists; then
        docker rm "$CONTAINER_NAME"
    fi
    
    info "MorphBox VM removed"
}

# Reset Claude authentication (clear stored credentials)
reset_auth() {
    warn "⚠️  This will clear all Claude authentication data!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Cancelled"
        return 0
    fi
    
    info "Resetting Claude authentication..."
    
    # Remove the Claude config volume
    if docker volume ls | grep -q "morphbox_claude-config"; then
        docker volume rm morphbox_claude-config 2>/dev/null || true
    fi
    
    # If container is running, clear the config directory
    if is_container_running; then
        ssh -o StrictHostKeyChecking=no -p 2222 morphbox@localhost 'rm -rf ~/.config/claude-code/*' 2>/dev/null || true
    fi
    
    info "Claude authentication reset. You'll need to log in again."
}

# Check Claude authentication status
check_auth() {
    info "Checking Claude authentication status..."
    
    if ! is_container_running; then
        error "MorphBox VM is not running. Start it with: $0 start"
        return 1
    fi
    
    # Try to run a simple Claude command using docker exec (avoids SSH issues)
    if docker exec morphbox-vm claude --version 2>/dev/null | grep -q "Claude"; then
        info "Claude CLI is available"
        
        # Check if authenticated using the built-in script
        if docker exec morphbox-vm /usr/local/bin/check-claude-auth 2>/dev/null; then
            info "✅ Claude is authenticated and ready"
            return 0
        else
            warn "⚠️  Claude is installed but not authenticated"
            info "Authentication will happen automatically when you connect"
            return 1
        fi
    else
        error "Claude CLI is not available in the container"
        return 1
    fi
}

# Interactive Claude login
login() {
    info "Starting Claude authentication process..."
    
    if ! is_container_running; then
        error "MorphBox VM is not running. Start it with: $0 start"
        return 1
    fi
    
    info "Opening interactive SSH session for Claude login..."
    info "Once connected, run: claude auth login"
    info "After authentication, you can detach with Ctrl+B then D"
    info "Or exit completely with: exit"
    
    # Open interactive SSH session to persistent tmux session
    ssh -o StrictHostKeyChecking=no -p 2222 morphbox@localhost 'morphbox-session'
}

# Connect to existing session
connect() {
    info "Connecting to MorphBox terminal session..."
    
    if ! is_container_running; then
        error "MorphBox VM is not running. Start it with: $0 start"
        return 1
    fi
    
    info "Connecting to persistent terminal session..."
    info "Your previous work should be preserved here"
    info "Detach with Ctrl+B then D, or exit with: exit"
    
    # Connect to persistent tmux session
    ssh -o StrictHostKeyChecking=no -p 2222 morphbox@localhost 'morphbox-session'
}

# List active sessions
list_sessions() {
    info "Listing active terminal sessions..."
    
    if ! is_container_running; then
        error "MorphBox VM is not running. Start it with: $0 start"
        return 1
    fi
    
    ssh -o StrictHostKeyChecking=no -p 2222 morphbox@localhost 'tmux list-sessions 2>/dev/null || echo "No active sessions"'
}

# Kill all sessions (use with caution)
kill_sessions() {
    warn "⚠️  This will kill all terminal sessions and lose unsaved work!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Cancelled"
        return 0
    fi
    
    info "Killing all terminal sessions..."
    
    if ! is_container_running; then
        error "MorphBox VM is not running"
        return 1
    fi
    
    ssh -o StrictHostKeyChecking=no -p 2222 morphbox@localhost 'tmux kill-server 2>/dev/null || echo "No sessions to kill"'
    info "All sessions killed"
}

# Get VM status
status() {
    info "MorphBox VM Status:"
    
    if is_container_running; then
        echo "  Container: ✅ Running"
        
        # Get container info
        local container_id=$(docker ps --filter "name=$CONTAINER_NAME" --format "{{.ID}}")
        local created=$(docker inspect "$container_id" --format "{{.Created}}" | cut -d'T' -f1)
        local uptime=$(docker inspect "$container_id" --format "{{.State.StartedAt}}" | cut -d'T' -f2 | cut -d'.' -f1)
        
        echo "  Started: $created at $uptime"
        echo "  SSH: localhost:2222"
        
        # Check SSH connectivity (simplified)
        if docker exec morphbox-vm ps aux | grep -q sshd; then
            echo "  SSH Status: ✅ SSH daemon running"
        else
            echo "  SSH Status: ❌ SSH daemon not running"
        fi
        
        # Check Claude status
        check_auth 2>/dev/null && echo "  Claude Auth: ✅ Authenticated" || echo "  Claude Auth: ❌ Not authenticated"
        
    elif container_exists; then
        echo "  Container: ⏸️  Stopped"
    else
        echo "  Container: ❌ Not created"
    fi
    
    # Check volumes
    if docker volume ls | grep -q "morphbox_claude-config"; then
        echo "  Claude Config: ✅ Persisted"
    else
        echo "  Claude Config: ❌ Not persisted"
    fi
}

# Show logs
logs() {
    if ! container_exists; then
        error "Container does not exist"
        return 1
    fi
    
    docker logs "$CONTAINER_NAME" "$@"
}

# Show help
show_help() {
    echo "MorphBox VM Manager"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "VM Management:"
    echo "  start       Start the MorphBox VM"
    echo "  stop        Stop the MorphBox VM"
    echo "  restart     Restart the MorphBox VM"
    echo "  remove      Remove the MorphBox VM (loses authentication!)"
    echo "  status      Show VM and authentication status"
    echo "  logs        Show container logs"
    echo ""
    echo "Authentication:"
    echo "  login       Open interactive session for Claude authentication"
    echo "  check-auth  Check Claude authentication status"
    echo "  reset-auth  Reset Claude authentication (clear stored credentials)"
    echo ""
    echo "Terminal Sessions:"
    echo "  connect     Connect to persistent terminal session"
    echo "  sessions    List active terminal sessions"
    echo "  kill-sessions  Kill all terminal sessions (⚠️ loses work)"
    echo ""
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                 # Start the VM"
    echo "  $0 login                 # Authenticate with Claude (first time)"
    echo "  $0 connect               # Connect to your persistent terminal"
    echo "  $0 status                # Check everything is working"
    echo ""
    echo "Tmux Commands (when connected):"
    echo "  Ctrl+B then D            # Detach from session (keeps running)"
    echo "  exit                     # Exit session completely"
    echo "  tmux list-sessions       # List active sessions"
}

# Main command dispatcher
main() {
    check_docker
    
    case "${1:-help}" in
        start)
            start_vm
            ;;
        stop)
            stop_vm
            ;;
        restart)
            restart_vm
            ;;
        remove)
            remove_vm
            ;;
        status)
            status
            ;;
        login)
            login
            ;;
        check-auth)
            check_auth
            ;;
        reset-auth)
            reset_auth
            ;;
        connect)
            connect
            ;;
        sessions)
            list_sessions
            ;;
        kill-sessions)
            kill_sessions
            ;;
        logs)
            shift
            logs "$@"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"