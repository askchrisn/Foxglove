# Build stage
FROM node:16 as build
WORKDIR /src
COPY . ./

RUN corepack enable
RUN yarn install
RUN yarn run web:build:prod

# Release stage
FROM caddy:2.5.2-alpine
WORKDIR /src
COPY --from=build /src/web/.webpack ./

EXPOSE 8080

# Create the entrypoint script using RUN and echo
RUN echo '#!/bin/sh\n\
# Optionally override the default layout with one provided via bind mount\n\
mkdir -p /foxglove\n\
touch /foxglove/default-layout.json\n\
index_html=$(cat index.html)\n\
replace_pattern="/*FOXGLOVE_STUDIO_DEFAULT_LAYOUT_PLACEHOLDER*/"\n\
replace_value=$(cat /foxglove/default-layout.json)\n\
echo "${index_html/"$replace_pattern"/$replace_value}" > index.html\n\
\n\
# Continue executing the CMD\n\
exec "$@"' > /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
CMD ["caddy", "file-server", "--listen", ":8080"]
