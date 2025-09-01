# Use Node.js official image
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Expose the port
EXPOSE 3004

# Start the server
CMD ["node", "server.js"]
