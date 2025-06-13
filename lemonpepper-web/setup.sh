#!/bin/bash

# Enable verbose output
set -x

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

echo "Backend setup complete!"
echo ""
echo "To start the backend server, run:"
echo "cd $BACKEND_DIR && source venv/bin/activate && python app.py"
echo ""
echo "To install frontend dependencies, run:"
echo "cd $FRONTEND_DIR && npm install --legacy-peer-deps --force"
echo ""
echo "To start the frontend server, run:"
echo "cd $FRONTEND_DIR && npm start" 