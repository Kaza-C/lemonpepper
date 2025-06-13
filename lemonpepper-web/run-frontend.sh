#!/bin/bash

# Define base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$BASE_DIR/frontend"

# Run the React app
cd "$FRONTEND_DIR" && npm start 