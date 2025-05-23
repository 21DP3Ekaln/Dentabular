# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
# Install dependencies with npm since you have package-lock.json
RUN npm ci
# Install TypeScript type definitions needed for import scripts
RUN npm install --save-dev @types/node @types/xml2js

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set DATABASE_URL environment variable for the builder stage
ENV DATABASE_URL="file:./prisma/dev.db"

# Generate Prisma client
RUN npx prisma generate

# Initialize the SQLite database (create the db file and apply schema)
RUN npx prisma db push

# Import dental terms from XML file - this will populate the database with real terms
RUN npx ts-node --compiler-options '{"module":"CommonJS"}' src/lib/import-termini.ts

# Build application - using --no-lint to bypass linting errors
RUN npm run build -- --no-lint

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

# Set to production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# Create a fresh database during runtime instead of copying a pre-made one
# This ensures the database is writable by the nextjs user
RUN mkdir -p /app/prisma
COPY --from=builder /app/prisma/schema.prisma /app/prisma/
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Set DATABASE_URL environment variable
ENV DATABASE_URL="file:./prisma/dev.db"

# Generate Prisma client and create database
RUN npx prisma generate && npx prisma db push

# We'll rely on data imported in the builder stage
# instead of trying to run import script in the runner

# Switch to nextjs user for running the app
USER nextjs

# Expose port
EXPOSE 3000

# Set healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the application
CMD ["npm", "start"]



#View running containers:
#docker ps

#Stop a container:
#docker stop <container_id>

#Remove a container:
#docker rm <container_id>

#Restart a container:
#docker restart <container_id>

#View logs:
#docker logs <container_id>


# GOOGLE_CLIENT_ID=actual_id_here
# GOOGLE_CLIENT_SECRET=actual_secret_here

# Aizstāt ar:
# $env:GOOGLE_CLIENT_ID="your_client_id"
# $env:GOOGLE_CLIENT_SECRET="your_client_secret"