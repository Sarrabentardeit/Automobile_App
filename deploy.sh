#!/usr/bin/env sh
set -eu

echo "Updating repository..."
git pull --rebase

echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Done."
