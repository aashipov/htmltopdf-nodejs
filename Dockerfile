FROM centos:7 AS base
ARG WKHTMLTOX_VERSION=0.12.6-1
ARG WKHTMLTOX_RPM=wkhtmltox-${WKHTMLTOX_VERSION}.centos7.x86_64.rpm
ADD https://github.com/wkhtmltopdf/packaging/releases/download/${WKHTMLTOX_VERSION}/${WKHTMLTOX_RPM} /tmp/
RUN groupadd deployment ; useradd -d /deployment/ -m -g deployment deployment ; \
yum install -y epel-release ; \
curl -sL https://rpm.nodesource.com/setup_lts.x | bash - ; \
yum install -y nodejs alsa-lib.x86_64 atk.x86_64 cups-libs.x86_64 gtk3.x86_64 ipa-gothic-fonts \
libXcomposite.x86_64 libXcursor.x86_64 libXdamage.x86_64 libXext.x86_64 libXi.x86_64 libXrandr.x86_64 \
libXScrnSaver.x86_64 libXtst.x86_64 pango.x86_64 xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi xorg-x11-fonts-cyrillic \
xorg-x11-fonts-misc xorg-x11-fonts-Type1 xorg-x11-utils /tmp/${WKHTMLTOX_RPM} ; rm -rf /tmp/${WKHTMLTOX_RPM} ; \
yum clean all

FROM base AS builder
USER root
RUN npm install -g node-prune
WORKDIR /deployment/
COPY --chown=deployment:deployment ./ ./
USER deployment
RUN npm install --production ; npm prune --production ; node-prune

FROM base AS final
EXPOSE 8080
COPY --from=builder --chown=deployment:deployment /deployment/ /deployment/
WORKDIR /deployment/
USER deployment
CMD node server.js
HEALTHCHECK CMD curl -f http://localhost:8080/health || exit 1
