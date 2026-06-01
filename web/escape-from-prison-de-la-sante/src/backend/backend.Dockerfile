FROM node:20-alpine

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src ./src

ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/index.js"]
