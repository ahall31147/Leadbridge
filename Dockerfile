# Use Node.js base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy backend package files
COPY package*.json ./

# Install backend dependencies
RUN npm install

# Copy backend source code
COPY . .

# Copy frontend directory
COPY frontend ./frontend

# Build frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Move built frontend to backend's public directory
RUN mkdir -p /app/public
RUN cp -r dist/* /app/public/

# Clean up frontend source to save space
RUN rm -rf /app/frontend

# Return to backend directory
WORKDIR /app

# Expose the port
EXPOSE 3001

# Command to run the application
CMD ["node", "index.js"]
