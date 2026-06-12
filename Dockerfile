FROM node:20-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npx vite build

FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY index.js ./
COPY data/ ./data/
COPY --from=frontend /build/dist ./public
EXPOSE 3001
CMD ["node", "index.js"]