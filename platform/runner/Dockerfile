FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1

LABEL org.opencontainers.image.title="Mini PaaS Deployment Runner" \
      org.opencontainers.image.version="p1-observability" \
      org.opencontainers.image.description="Ranh giới đặc quyền điều khiển các container mẫu theo danh sách cho phép"

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src

# Runner phải truy cập Docker socket. Quyền root trong container không làm giảm
# mức rủi ro của socket; vì vậy service này được cô lập mạng và không mở cổng host.
EXPOSE 3001

CMD ["node", "src/main.mjs"]
