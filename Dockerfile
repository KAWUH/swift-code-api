# Stage 1: Build the application
FROM node:20-slim AS builder

# Install openssl (recommended by Prisma warning)
RUN apt-get update && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install ALL dependencies needed for build
COPY package*.json ./
RUN npm install

# Copy prisma schema and generate client
# Ensure prisma generate runs AFTER full npm install
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Stage 2: Production image
FROM node:20-slim

# Install openssl in production image
RUN apt-get update && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --only=production --ignore-scripts # Ignore scripts like postinstall for prisma generate

# Copy necessary artifacts from builder stage
# Copy compiled code
COPY --from=builder /app/dist ./dist
# Copy prisma schema
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
# Copy generated Prisma Client
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client

# Expose the application port
EXPOSE 8080

# Command to run the application
CMD ["node", "dist/server.js"]