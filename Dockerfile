FROM node:20-slim

RUN apt-get update && apt-get install -y \
    espeak-ng \
    python3 \
    python3-pip \
    python3-venv \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY requirements.txt ./
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install -r requirements.txt

ENV PATH="/opt/venv/bin:$PATH"

COPY . .
RUN npm run railway:build && \
    chmod +x Rhubarb-Lip-Sync-1.14.0-Linux/rhubarb

EXPOSE 3001

CMD ["node", "server/index.js"]
