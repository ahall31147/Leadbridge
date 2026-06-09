FROM node:20-slimWORKDIR /app
COPY package*.json ./RUN npm install --production=false
COPY index.js ./COPY data/ ./data/COPY build.sh ./
COPY frontend/package*.json ./frontend/RUN cd frontend && npm installCOPY frontend/ ./frontend/RUN cd frontend && npm run build
RUN mkdir -p public && cp -r frontend/dist/* public/ && rm -rf frontend/
EXPOSE 3001CMD ["node", "index.js"]
