# Базовий образ Node.js (легка версія Alpine)
FROM node:20-alpine

# Робоча папка всередині контейнера
WORKDIR /app

# Копіюємо файли залежностей
COPY package*.json ./

# Встановлюємо залежності (postinstall сам зкомпілює TypeScript)
RUN npm install

# Копіюємо решту коду
COPY . .

# Білдимо ще раз про всяк випадок (якщо postinstall не спрацював)
RUN npm run build

# Відкриваємо порт 8080 (для health checks)
EXPOSE 8080

# Команда запуску
CMD ["npm", "start"]