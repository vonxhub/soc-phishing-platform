FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build          # ← FIX: build step added
EXPOSE 3001
CMD ["node", "dist/server.js"]
