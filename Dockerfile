# UI Svelte (webapp) — esto es lo que debe verse en Render, no el HTML legacy
FROM node:22-alpine AS ui
WORKDIR /src/webapp
COPY webapp/package.json webapp/package-lock.json ./
RUN npm ci
COPY webapp/ ./
# vite outDir = ../web/dist → /src/web/dist
RUN npm run build \
 && mkdir -p /out/assets \
 && cp -f /src/web/dist/index.html /out/index.html \
 && cp -a /src/web/dist/assets/. /out/assets/ \
 && (cp -f /src/web/dist/*.svg /out/ 2>/dev/null || true)

FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download 2>/dev/null || true
COPY . .
RUN go mod tidy && CGO_ENABLED=0 go build -ldflags='-s -w' -o /abacophy ./cmd/abacophy

FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /abacophy /app/abacophy
COPY static /app/static
COPY --from=ui /out/index.html /app/static/index.html
COPY --from=ui /out/assets /app/static/assets
COPY --from=ui /out/index.html /app/static/app/index.html
RUN mkdir -p /app/static/app/assets && cp -a /app/static/assets/. /app/static/app/assets/ || true
COPY --from=ui /out/ /tmp/ui-out/
RUN cp -f /tmp/ui-out/*.svg /app/static/ 2>/dev/null || true; rm -rf /tmp/ui-out
ENV PORT=10000
ENV ABACOPHY_STATIC=/app/static
ENV ABACOPHY_DATA=/app/data
EXPOSE 10000
CMD ["/app/abacophy"]
