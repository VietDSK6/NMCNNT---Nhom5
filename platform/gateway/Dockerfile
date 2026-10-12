FROM nginx:1.28-alpine@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236

LABEL org.opencontainers.image.title="Mini PaaS Gateway" \
      org.opencontainers.image.version="p0.2c" \
      org.opencontainers.image.description="Cổng truy cập duy nhất cho Dashboard, API và các ứng dụng mẫu"

RUN rm -f /etc/nginx/conf.d/default.conf \
    && chown -R nginx:nginx /usr/share/nginx/html

COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf

USER nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
