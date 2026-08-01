FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY server.mjs ./
COPY lib ./lib
COPY public ./public
COPY assets ./assets

ENV NODE_ENV=production
ENV PORT=4173
EXPOSE 4173

USER node
CMD ["node", "server.mjs"]
