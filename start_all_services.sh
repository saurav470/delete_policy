#!/bin/bash

# Start Backend on port 8000
echo "Starting Backend..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start Voice Agent on port 8080
echo "Starting Voice Agent..."
cd voice-agent && go run main.go &
VOICE_PID=$!
cd ..

# Wait a bit for voice agent to start
sleep 2

# Start Frontend on port 5000 (main entry point)
echo "Starting Frontend on port 5000..."
cd frontend && npm run dev

# Cleanup function
cleanup() {
    echo "Shutting down services..."
    kill $BACKEND_PID $VOICE_PID
    exit 0
}

trap cleanup SIGTERM SIGINT

# Wait for frontend (main process)
wait
