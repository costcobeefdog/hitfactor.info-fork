FROM node:20.11
WORKDIR /
COPY . .
RUN npm ci
RUN npx playwright install-deps
RUN npx playwright install
EXPOSE 3000
CMD ["npm", "run", "prod"]
