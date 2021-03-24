FROM aashipov/htmltopdf:buildbed AS builder
USER root
WORKDIR /dummy/
COPY --chown=dummy:dummy ./ ./
USER dummy
RUN npm install --production && npm prune --production && node-prune

FROM aashipov/htmltopdf:base
USER root
EXPOSE 8080
COPY --from=builder /usr/lib64/chromium-browser/swiftshader/ /usr/lib64/chromium-browser/swiftshader/
COPY --from=builder --chown=dummy:dummy /dummy/ /dummy/
WORKDIR /dummy/
USER dummy
CMD node server.js
