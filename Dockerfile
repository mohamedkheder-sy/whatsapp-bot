FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

# تأكد من وجود النقطتين بهذا الشكل
COPY . .

EXPOSE 8000

CMD ["node", "app.js"]
