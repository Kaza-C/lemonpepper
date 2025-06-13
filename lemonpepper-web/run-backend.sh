#!/bin/bash

# Define base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$BASE_DIR/backend"

# Activate the virtual environment
source "$BACKEND_DIR/venv/bin/activate" || { echo "Failed to activate virtual environment. Make sure to run setup.sh first."; exit 1; }

# Run the Flask app
cd "$BACKEND_DIR" && python app.py 