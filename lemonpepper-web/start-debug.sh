#!/bin/bash

# Function to handle script exit
cleanup() {
  echo "Stopping servers..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit
}

# Set up trap to catch SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Enable verbose output
set -x

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
  echo "Python 3 is required but not installed. Please install Python 3 and try again."
  exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Node.js is required but not installed. Please install Node.js and try again."
  exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo "npm is required but not installed. Please install npm and try again."
  exit 1
fi

# Define base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$BASE_DIR/backend"
FRONTEND_DIR="$BASE_DIR/frontend"

# Setup Python virtual environment
echo "Setting up Python virtual environment..."
python3 -m venv "$BACKEND_DIR/venv" || { echo "Failed to create virtual environment"; exit 1; }
source "$BACKEND_DIR/venv/bin/activate" || { echo "Failed to activate virtual environment"; exit 1; }

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip || { echo "Failed to upgrade pip"; exit 1; }

# Install backend requirements
echo "Installing backend requirements..."
pip install -r "$BACKEND_DIR/requirements.txt" || { echo "Failed to install backend requirements"; exit 1; }

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd "$FRONTEND_DIR" && npm install --legacy-peer-deps || { echo "Failed to install frontend dependencies"; exit 1; }

# Start backend server
echo "Starting backend server..."
cd "$BACKEND_DIR" && python app.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait a bit for the backend to start
sleep 3

# Check if backend is running
if ! ps -p $BACKEND_PID > /dev/null; then
  echo "Backend failed to start. Check logs above."
  exit 1
fi

# Start frontend development server
echo "Starting frontend server..."
cd "$FRONTEND_DIR" && npm start &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait a bit for the frontend to start
sleep 5

# Check if frontend is running
if ! ps -p $FRONTEND_PID > /dev/null; then
  echo "Frontend failed to start. Check logs above."
  kill $BACKEND_PID
  exit 1
fi

echo "LemonPepper Web is starting..."
echo "Backend running with PID: $BACKEND_PID"
echo "Frontend running with PID: $FRONTEND_PID"
echo "Open your browser and navigate to: http://localhost:3000"
echo "Press Ctrl+C to stop both servers."

# Wait for both processes to finish
wait $BACKEND_PID $FRONTEND_PID 