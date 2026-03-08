FROM node:20-slim

# Chromium ve temel bağımlılıklar
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Ortam değişkenleri
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

# Bağımlılıkları kur
COPY package*.json ./
RUN npm install

# Uygulama kodunu kopyala
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
