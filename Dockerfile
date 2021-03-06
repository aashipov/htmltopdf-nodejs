FROM aashipov/docker:builder AS builder
USER root
WORKDIR /dummy/
COPY --chown=dummy:dummy ./ ./
USER dummy
RUN npm install --production && npm prune --production && node-prune

FROM aashipov/docker:wknch
USER root
EXPOSE 8080
COPY --from=builder --chown=dummy:dummy /dummy/ /dummy/
WORKDIR /dummy/
USER dummy
CMD node server.js
