# Multi-stage Dockerfile for Claudette v3.0.1 Production Deployment
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY *.md ./

# Build TypeScript to JavaScript
RUN npm run build

# Verify build completed
RUN ls -la dist/

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S claudette && \
    adduser -S claudette -u 1001 -G claudette

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/*.md ./

# Copy configuration files
COPY src/config/*.json ./config/

# Create directory for logs and cache
RUN mkdir -p logs cache data && \
    chown -R claudette:claudette /app

# Switch to non-root user
USER claudette

# Environment variables for production
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV CACHE_DIR=/app/cache
ENV DATA_DIR=/app/data

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
                 const options = { hostname: 'localhost', port: 3000, path: '/health', timeout: 5000 }; \
                 const req = http.request(options, (res) => process.exit(res.statusCode === 200 ? 0 : 1)); \
                 req.on('error', () => process.exit(1)); \
                 req.on('timeout', () => process.exit(1)); \
                 req.end();" || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]

# Labels for metadata
LABEL maintainer="Claudette Team"
LABEL version="3.0.1"
LABEL description="Claudette AI Middleware - Production Ready Container"
LABEL org.opencontainers.image.source="https://github.com/claudette-ai/claudette"
LABEL org.opencontainers.image.documentation="https://docs.claudette.ai"
LABEL org.opencontainers.image.title="Claudette AI Middleware"
LABEL org.opencontainers.image.description="High-performance AI middleware with intelligent backend routing"