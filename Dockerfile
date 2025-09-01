# Multi-stage build for production
FROM node:18-alpine AS frontend-build

# Build frontend
WORKDIR /app/frontend
COPY frontend-package.json package.json
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy server files
COPY package.json .
COPY server.js .
RUN npm install --only=production

# Copy built frontend
COPY --from=frontend-build /app/dist ./dist

EXPOSE 3001

CMD ["npm", "start"]
