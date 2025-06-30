FROM node:22 AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN pnpm install
COPY . .
ENV VITE_REMOVE_GENERATED_CITE=TRUE
RUN pnpm build

FROM nginx:1.29
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
