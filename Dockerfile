FROM node:20.8.0 as base
WORKDIR /pedestrian
# Install Chrome dependencies for puppeteer
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    # Add puppeteer user for Chrome sandbox
    && groupadd -r pptruser \
    && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /pedestrian
# Use puppeteer user for Chrome sandbox
USER pptruser
COPY package*.json ./

FROM base as build
# Install runtime and build dependencies
RUN npm ci
# Copy source code into current image
COPY . .
# Test source code
RUN npm test \
    # Build source code
    && npm run build

FROM base
# Install runtime dependencies
RUN npm ci --omit=dev
# Copy built source code into current image
COPY --from=build /pedestrian/build ./build
# Expose port used by Express
EXPOSE 8080

CMD npm run production
