FROM node:20-slim

# ffmpeg не входить у базовий образ Node — ставимо окремо, fontconfig — для рендеру шрифту на текстурах
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fontconfig \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .

# Реєструємо рукописний шрифт (assets/Kalam-Regular.ttf) у системі, щоб SVG->PNG рендер міг його знайти за назвою "Kalam"
RUN mkdir -p /usr/share/fonts/truetype/kalam \
    && cp assets/Kalam-Regular.ttf /usr/share/fonts/truetype/kalam/ \
    && fc-cache -f

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
