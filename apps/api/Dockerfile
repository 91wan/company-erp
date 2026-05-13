FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY database/prisma database/prisma
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run db:generate \
  && npm run build -w @company-erp/api \
  && npm prune --omit=dev

FROM node:22-alpine AS runtime

WORKDIR /app
ARG APP_COMMIT_SHA=unknown
ARG APP_BUILD_TIME=unknown
ARG APP_PACKAGE_VERSION=unknown
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=3001
ENV APP_COMMIT_SHA=${APP_COMMIT_SHA}
ENV APP_BUILD_TIME=${APP_BUILD_TIME}
ENV APP_PACKAGE_VERSION=${APP_PACKAGE_VERSION}
ENV APP_DEPLOYED_AT=unknown
ENV APP_ENVIRONMENT=container

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/database/prisma database/prisma
COPY --from=build /app/packages/shared packages/shared
COPY --from=build /app/apps/api apps/api

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
