# syntax=docker/dockerfile:1

FROM golang:1.27-alpine AS build

WORKDIR /src
RUN apk add --no-cache ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM alpine:3.22

RUN addgroup -S app && adduser -S app -G app \
    && apk add --no-cache ca-certificates tzdata

USER app
WORKDIR /app
COPY --from=build /out/api /usr/local/bin/api

EXPOSE 8080
ENTRYPOINT ["api"]
