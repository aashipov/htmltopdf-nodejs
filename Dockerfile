FROM centos:7 AS base
ARG WKHTMLTOX_VERSION=0.12.6-1
ARG WKHTMLTOX_RPM=wkhtmltox-${WKHTMLTOX_VERSION}.centos7.x86_64.rpm
ADD https://github.com/wkhtmltopdf/packaging/releases/download/${WKHTMLTOX_VERSION}/${WKHTMLTOX_RPM} /tmp/
RUN groupadd dummy ; useradd -d /dummy/ -m -g dummy dummy ; \
yum install -y epel-release ; \
curl -sL https://rpm.nodesource.com/setup_lts.x | bash - ; \
yum install -y nodejs chromium-headless fontconfig /tmp/${WKHTMLTOX_RPM} ; rm -rf /tmp/${WKHTMLTOX_RPM} ; \
yum clean all ; ln -s /usr/lib64/chromium-browser/headless_shell /usr/bin/chromium

FROM base AS buildbed
USER root
RUN yum install -y chromium ; npm install -g node-prune

FROM buildbed AS builder
USER root
WORKDIR /dummy/
COPY --chown=dummy:dummy ./ ./
USER dummy
RUN npm install --production ; npm prune --production ; node-prune

FROM base AS final
USER root
EXPOSE 8080
COPY --from=builder /usr/lib64/chromium-browser/swiftshader/ /usr/lib64/chromium-browser/swiftshader/
COPY --from=builder --chown=dummy:dummy /dummy/ /dummy/
WORKDIR /dummy/
USER dummy
CMD node server.js
HEALTHCHECK CMD curl -f http://localhost:8080/health || exit 1
