FROM node:24-alpine

ENV CI=true

RUN npm install -g pnpm@10

RUN apk add --no-cache \
    git \
    docker-cli \
    docker-cli-compose

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --ignore-scripts=false
RUN pnpm add -D esbuild

COPY . .

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["pnpm", "run", "dev"]