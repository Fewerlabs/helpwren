# syntax=docker/dockerfile:1
#
# The Helpwren app as a small production image: Next's standalone server and nothing else.
# Build it from the repository's root, which holds the workspace it needs:
#
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_APP_URL=https://support.example.com \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://api.example.com \
#     --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
#     -t helpwren-web .
#
# The NEXT_PUBLIC_ values are written into the browser's code when the image is built, so an
# image belongs to one install. deploy/docker/docker-compose.yml passes them for you.

ARG NODE_IMAGE=node:26.8.2-alpine3.24

# Dependencies, from the lockfile alone, so this layer is reused until the lockfile changes.
FROM ${NODE_IMAGE} AS deps
WORKDIR /repo
RUN npm install --global pnpm@12.21.0
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

FROM deps AS build
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# The commit, for /api/health: the build has no git history to read it from.
ARG HELPWREN_COMMIT=""
COPY . .
# HUSKY=0: there is no repository to install commit hooks into.
RUN HUSKY=0 pnpm install --offline --frozen-lockfile
# Self-hosted Supabase Auth fetches its email templates over HTTP, so the sign-in code email
# is served by the app. See deploy/docker/supabase-overrides.yml.
RUN mkdir -p apps/web/public/email-templates \
  && cp supabase/templates/sign-in-code.html apps/web/public/email-templates/
# The secret key is checked when the app loads, including while building; a stand-in passes
# the check and is not kept in the image. The real one is given when the container starts.
RUN HELPWREN_STANDALONE=1 \
  NEXT_TELEMETRY_DISABLED=1 \
  NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
  NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} \
  SUPABASE_SECRET_KEY=build-time-stand-in \
  HELPWREN_COMMIT=${HELPWREN_COMMIT} \
  pnpm --filter @helpwren/web build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3000 \
  HOSTNAME=0.0.0.0
# The standalone output keeps the workspace's shape: the server is apps/web/server.js.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
# The official image's unprivileged user.
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/web/server.js"]
