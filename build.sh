#!/bin/bash

# Build the frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Move built files to public/
echo "Moving built files to backend/public/..."
mkdir -p public
cp -r frontend/dist/* public/

echo "Build complete."
