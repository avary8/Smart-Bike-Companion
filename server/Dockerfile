FROM node:12
WORKDIR /app

ENV NODE_ENV production

COPY package*.json ./

RUN npm install

COPY . .

RUN npm install -g pm2

EXPOSE 3500

CMD ["pm2-runtime", "server.js"]