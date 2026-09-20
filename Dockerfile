FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download 2>/dev/null || true
COPY . .
RUN go mod tidy && CGO_ENABLED=0 go build -o /abacophy ./cmd/abacophy

FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /abacophy /app/abacophy
COPY static /app/static
ENV PORT=10000
ENV ABACOPHY_STATIC=/app/static
ENV ABACOPHY_DATA=/app/data
EXPOSE 10000
CMD ["/app/abacophy"]
