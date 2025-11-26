#!/bin/sh
set -e

# Expects BUILD_ASSETS_BUCKET to be set in the environment

if [ -f Dockerfile ]; then
  echo "Dockerfile already exists. Skipping generation."
  exit 0
fi

echo "Detecting project type..."

if [ -f package.json ]; then
  echo "Node.js project detected."
  echo "Downloading Node.js Dockerfile template..."
  aws s3 cp s3://$BUILD_ASSETS_BUCKET/templates/Dockerfile.node Dockerfile
elif [ -f requirements.txt ]; then
  echo "Python project detected."
  echo "Downloading Python Dockerfile template..."
  aws s3 cp s3://$BUILD_ASSETS_BUCKET/templates/Dockerfile.python Dockerfile
else
  echo "Unknown project type. No package.json or requirements.txt found."
  exit 1
fi

echo "Dockerfile generated successfully."

