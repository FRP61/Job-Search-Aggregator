# Сборка фронтенда в статические файлы и раздача их через nginx.
#   docker build --build-arg VITE_API_URL=https://api.example.com/api/v1 -t jsa-frontend .
#   docker run -p 3000:80 jsa-frontend   →   http://localhost:3000

# 1. Сборка: npm ci + vite build. Адрес API вшивается в файлы при сборке
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:8000/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# 2. Раздача: только готовые файлы и nginx, без Node.js
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
