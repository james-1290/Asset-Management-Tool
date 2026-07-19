# Multi-stage build: compile the SPA with Node, serve the static bundle with
# nginx. The dev server (Vite) is never used in production — see nginx.conf for
# the security-header suite and API proxy.

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
