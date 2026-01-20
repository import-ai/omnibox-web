FROM node:22 AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable
RUN pnpm install
COPY . .
ENV VITE_REMOVE_GENERATED_CITE=TRUE

RUN pnpm build

FROM nginx:1.29
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/node_modules/vditor/dist /usr/share/nginx/html/assets/vditor/dist
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
RUN cd /usr/share/nginx/html && find assets -type f \( -name "*.js" -o -name "*.css" -o -name "*.woff" -o -name "*.woff2" -o -name "*.ttf" -o -name "*.svg" \) -exec gzip -kf9 {} \;
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
