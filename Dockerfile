FROM node:22-bookworm-slim AS dependencies

ENV NODE_ENV=development

WORKDIR /workspace

RUN chown node:node /workspace

USER node

COPY --chown=node:node package.json package-lock.json ./

RUN npm ci

FROM dependencies AS source

COPY --chown=node:node . .

FROM source AS development

CMD ["npm", "run", "dev"]

FROM source AS verification

RUN npm run verify

FROM scratch AS artifact

COPY --from=verification /workspace/dist/ /
