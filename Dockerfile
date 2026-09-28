FROM node:22-bookworm-slim

ENV NODE_ENV=development

WORKDIR /workspace

RUN chown node:node /workspace

USER node

COPY --chown=node:node package.json package-lock.json ./

RUN npm ci

COPY --chown=node:node . .

RUN npm run typecheck \
    && npm test \
    && npm run build

CMD ["npm", "run", "dev"]
