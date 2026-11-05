# All-in-one image: static frontend (nginx) + PM server (node, container-loopback only).
# Build from the repository root:
#   docker build -f deploy/Dockerfile -t planner .

# ---- Stage 1: build frontend ----
FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public ./public
COPY src ./src
RUN VITE_PM_SAME_ORIGIN=true npm run build

# ---- Stage 2: build PM/MCP server ----
FROM node:22-alpine AS pmbuild
WORKDIR /app/mcp-server
COPY mcp-server/package.json mcp-server/package-lock.json ./
RUN npm ci
COPY src/lib/blocks.ts /app/src/lib/blocks.ts
COPY mcp-server ./
RUN npm run build

# ---- Stage 3: runtime ----
FROM node:22-alpine
RUN apk add --no-cache nginx openssl

WORKDIR /app
COPY --from=pmbuild /app/mcp-server/dist ./pm-server/dist
COPY --from=pmbuild /app/mcp-server/package.json ./pm-server/package.json
COPY --from=pmbuild /app/mcp-server/node_modules ./pm-server/node_modules
COPY --from=frontend /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/http.d/default.conf
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /data/projects /data/workflows

ENV PLANNER_PROJECTS_DIR=/data/projects \
    PLANNER_WORKFLOWS_DIR=/data/workflows \
    PLANNER_PM_PORT=7808

VOLUME ["/data"]
EXPOSE 8080 7808

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["/entrypoint.sh"]
