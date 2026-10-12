FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
    && npm prune --omit=dev

FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS runtime

LABEL org.opencontainers.image.title="Mini PaaS Control API" \
      org.opencontainers.image.version="p0.2c" \
      org.opencontainers.image.description="API xác thực, metadata và kiểm toán cho Mini PaaS"

ENV NODE_ENV=production
WORKDIR /app

RUN mkdir -p /data && chown node:node /data

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 3000

CMD ["node", "dist/main.js"]
