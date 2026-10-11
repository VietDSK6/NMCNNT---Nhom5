FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1

ARG APP_VERSION=v1.0.0

LABEL org.opencontainers.image.title="Mini PaaS - Ứng dụng A" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.description="Ứng dụng mẫu phục vụ kiểm chứng triển khai và cập nhật phiên bản"

ENV NODE_ENV=production \
    PORT=3000 \
    APP_ID=app-a \
    APP_NAME="Ứng dụng A" \
    APP_VERSION="${APP_VERSION}"

WORKDIR /app
COPY --chown=node:node server.mjs ./server.mjs

USER node
EXPOSE 3000

CMD ["node", "server.mjs"]
