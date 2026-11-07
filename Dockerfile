FROM node:22-alpine AS webbuild
WORKDIR /src
COPY webapp/package*.json ./webapp/
RUN cd webapp && npm ci
COPY webapp/ ./webapp/
RUN cd webapp && npm run check && npm test && npm run build

FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download 2>/dev/null || true
COPY . .
# The production API must serve the same frontend source that passed the webapp CI.
# Overlay web/dist on static/ so PWA support files under static/app remain available.
COPY --from=webbuild /src/web/dist/ /src/static/
RUN go mod tidy && CGO_ENABLED=0 go build -o /abacophy ./cmd/abacophy

FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /abacophy /app/abacophy
COPY --from=build /src/static /app/static
ENV PORT=10000
# Explicit production mode: container networking is controlled by the deployment platform.
ENV ABACOPHY_BIND_MODE=PRODUCTION
ENV ABACOPHY_HOST=0.0.0.0
ENV ABACOPHY_STATIC=/app/static
ENV ABACOPHY_DATA=/app/data
EXPOSE 10000
CMD ["/app/abacophy"]
