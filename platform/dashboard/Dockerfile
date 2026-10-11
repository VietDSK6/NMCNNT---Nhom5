FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

FROM nginx:1.28-alpine@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236

LABEL org.opencontainers.image.title="Mini PaaS Dashboard" \
      org.opencontainers.image.version="p0.2b" \
      org.opencontainers.image.description="Giao diện quản trị Mini PaaS"

RUN rm -f /etc/nginx/conf.d/default.conf \
    && chown -R nginx:nginx /usr/share/nginx/html

COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
