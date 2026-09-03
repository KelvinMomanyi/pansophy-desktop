FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_OLLAMA_API_URL=http://localhost:8080/ollama
ENV VITE_OLLAMA_API_URL=$VITE_OLLAMA_API_URL
RUN npm run build

FROM nginx:1.29-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget --quiet --output-document=/dev/null http://127.0.0.1/ || exit 1
