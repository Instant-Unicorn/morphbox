#!/bin/bash
# Debug script to run morphbox components individually

echo "Starting WebSocket proxy..."
node ~/.npm-global/lib/node_modules/morphbox/websocket-proxy.js 100.96.36.2 &
WS_PID=$!
echo "WebSocket proxy PID: $WS_PID"

sleep 2

echo "Starting web server..."
HOST=100.96.36.2 PORT=8008 node ~/.npm-global/lib/node_modules/morphbox/server-packaged.js &
WEB_PID=$!
echo "Web server PID: $WEB_PID"

sleep 3

echo "Checking processes..."
ps -p $WS_PID,$WEB_PID

echo "Checking ports..."
lsof -i :8008,8009

echo "Press Ctrl+C to stop"
trap "kill $WS_PID $WEB_PID 2>/dev/null; exit" INT TERM

# Keep running and check every 5 seconds
while true; do
  if ! kill -0 $WEB_PID 2>/dev/null; then
    echo "Web server died!"
    tail -20 ~/.npm-global/lib/node_modules/morphbox/morphbox.log
    break
  fi
  if ! kill -0 $WS_PID 2>/dev/null; then
    echo "WebSocket proxy died!"
    tail -20 ~/.npm-global/lib/node_modules/morphbox/websocket-proxy.log
    break
  fi
  sleep 5
done

echo "Cleaning up..."
kill $WS_PID $WEB_PID 2>/dev/null