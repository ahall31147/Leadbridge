FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production=false
COPY index.js ./
COPY data/ ./data/
COPY build.sh ./
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build
RUN mkdir -p public && cp -r frontend/dist/* public/ && rm -rf frontend/
EXPOSE 3001
CMD ["node", "index.js"]
