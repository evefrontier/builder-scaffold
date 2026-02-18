# Sui dev environment: CLI, local node, Node.js. Builds native for host arch (arm64/amd64).
# Ubuntu 24.04 required for Sui binary
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    jq \
    dos2unix \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g pnpm \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Sui CLI via suiup (native binary for build arch – works on ARM and x86)
ENV PATH="/root/.local/bin:/root/.suiup/bin:${PATH}"
RUN curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | sh \
    && echo y | suiup install sui \
    && sui --version

WORKDIR /workspace
ENV SUI_CONFIG_DIR=/root/.sui

COPY scripts/ /workspace/scripts/
RUN dos2unix /workspace/scripts/*.sh && chmod +x /workspace/scripts/*.sh

ENTRYPOINT ["/workspace/scripts/entrypoint.sh"]
