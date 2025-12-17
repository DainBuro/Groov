# --- Build Stage ---
FROM node:18-alpine AS builder

WORKDIR /app

# Copy only package files first for caching
COPY package*.json ./

# Install all deps (including dev deps for TypeScript)
RUN npm ci

# Copy source code and configuration
COPY tsconfig.json ./
COPY knexfile.ts ./
COPY update-types.ts ./
COPY src ./src
COPY migrations ./migrations

# Build the application
RUN npm run build

# --- Production Stage ---
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy compiled migration files and knexfile for runtime
COPY --from=builder /app/dist/migrations ./migrations
COPY --from=builder /app/dist/knexfile.js ./knexfile.js

# Copy seed SQL file (needed by seed script)
COPY --from=builder /app/src/jobs/seed.sql ./dist/src/jobs/seed.sql

# Copy entrypoint script
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

# Expose port
EXPOSE 3003

# Use entrypoint
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/index.js"]
