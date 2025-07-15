#\!/bin/bash
echo "Testing MorphBox persistence features..."
echo ""

# Test 1: Check if tmux is working in container
echo "1. Testing tmux in container:"
docker exec morphbox-vm tmux -V
echo ""

# Test 2: Create a test tmux session
echo "2. Creating test tmux session:"
docker exec morphbox-vm tmux new-session -d -s test-session 'echo "Test session created"'
echo ""

# Test 3: List tmux sessions
echo "3. Listing tmux sessions:"
docker exec morphbox-vm tmux list-sessions || echo "No sessions found"
echo ""

# Test 4: Clean up test session
echo "4. Cleaning up test session:"
docker exec morphbox-vm tmux kill-session -t test-session 2>/dev/null || echo "Session already cleaned"

echo "Tests completed\!"
