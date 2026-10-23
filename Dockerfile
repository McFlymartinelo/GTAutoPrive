# Build du front statique (Vite → dist/)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# API Express + SQLite (node:sqlite, Node >= 22.5)
FROM node:22-alpine AS api
ENV NODE_ENV=production DATA_DIR=/data PORT=3001
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY src/lib/calc.js ./src/lib/calc.js
COPY src/data/templates.js ./src/data/templates.js
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3001
CMD ["node", "server/index.js"]

# Service du build par nginx + proxy /api
FROM nginx:1.27-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf deploy/csp.conf /etc/nginx/snippets/
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
