# Sui dev environment: CLI, local node, Node.js. Builds native for host arch (arm64/amd64).
# Ubuntu 24.04 required for Sui binary
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Sui CLI via suiup (native binary for build arch – works on ARM and x86)
ENV PATH="/root/.local/bin:/root/.suiup/bin:${PATH}"
RUN curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | sh \
    && echo y | suiup install sui \
    && sui --version

WORKDIR /workspace
ENV SUI_CONFIG_DIR=/root/.sui

COPY setup-dev.sh entrypoint.sh common.sh /workspace/
RUN chmod +x /workspace/setup-dev.sh /workspace/entrypoint.sh /workspace/common.sh

ENTRYPOINT ["/workspace/entrypoint.sh"]
