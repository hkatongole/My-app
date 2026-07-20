#!/bin/bash
# termux_update.sh
# 
# Usage: ./termux_update.sh /path/to/new_database.sqlite
#
# This script installs python and the required packages if they aren't installed,
# then runs the migration script to push the latest SQLite data to Supabase.
# It is designed to be run on an Android phone using Termux.

set -e

if [ "$#" -ne 1 ]; then
    echo "Usage: ./termux_update.sh <path_to_sqlite_file>"
    echo "Example: ./termux_update.sh storage/downloads/plusone.sqlite"
    exit 1
fi

DB_FILE=$1

if [ ! -f "$DB_FILE" ]; then
    echo "Error: Database file '$DB_FILE' not found!"
    exit 1
fi

echo "=========================================="
echo " PlusOne Analytics — Cloud Sync (Termux) "
echo "=========================================="

# Check if python is installed
if ! command -v python &> /dev/null; then
    echo "Python not found. Installing python..."
    pkg update -y
    pkg install python -y
fi

# Ensure requests library is installed
if ! python -c "import requests" &> /dev/null; then
    echo "Installing requests library..."
    pip install requests
fi

echo "Starting sync..."
# Run the migration script
# IMPORTANT: Replace YOUR_SUPABASE_URL and YOUR_SERVICE_ROLE_KEY below
SUPABASE_URL="https://qkccqidouczjppioteqb.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2NxaWRvdWN6anBwaW90ZXFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE4NjY4NiwiZXhwIjoyMDk5NzYyNjg2fQ.HzPj5eWlk3vOGyFG5y4sz2f5IhGhSXr_8uq1oUtoIJA"
 
if [ "$SUPABASE_URL" = "https://qkccqidouczjppioteqb.supabase.co" ]; then
    echo "WARNING: You need to edit this script and set SUPABASE_URL and SERVICE_ROLE_KEY first!"
    exit 
fi

python migrate_to_supabase.py --db "$DB_FILE" --url "$SUPABASE_URL" --key "$SERVICE_ROLE_KEY"

echo "Sync complete!"
