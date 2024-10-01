const fs = require('fs');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Укажите токен вашего бота и чат ID
const TELEGRAM_TOKEN = '6769297888:AAFOeaKmGtsSSAGsSVGN-x3I1v_VQyh140M';
const CHAT_ID = '257319019'; // ID вашего чата или группы
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Включение/выключение отправки в Telegram
const SEND_TO_TELEGRAM = false; // Установите в false, если не нужно отправлять сообщения в Telegram

// Включение/выключение сохранения в файл
const SAVE_TO_FILE = true; // Установите в false, если не нужно сохранять результат в файл

// Чтение адресов и прокси из файлов
const addresses = fs.readFileSync('address.txt', 'utf8').split('\n').filter(Boolean);
let proxies = fs.readFileSync('proxies.txt', 'utf8').split('\n').filter(Boolean);

// Настраиваемый интервал времени между повторениями (в часах)
let hoursInterval = 12; // Можно изменить значение на нужное количество часов
const intervalMilliseconds = hoursInterval * 60 * 60 * 1000;

// Функция для отправки сообщения в Telegram
function sendToTelegram(message) {
  if (SEND_TO_TELEGRAM) {
    bot.sendMessage(CHAT_ID, message).catch((err) => {
      console.error('Ошибка отправки сообщения в Telegram:', err.message);
    });
  }
}

// Функция для сохранения результата в файл
function saveToFile(address, points) {
  if (SAVE_TO_FILE) {
    const data = `${address} ${points}\n`;
    fs.appendFileSync('results.txt', data, 'utf8');
  }
}

// Функция для выполнения запроса с использованием прокси
async function getNodeInfoWithProxy(address) {
  let retries = 3; // Количество попыток на один адрес с разными прокси

  while (retries > 0) {
    // Случайный выбор прокси
    const randomProxy = proxies[Math.floor(Math.random() * proxies.length)].trim();

    // Проверяем, соответствует ли прокси ожидаемому формату
    const proxyRegex = /^(http:\/\/)?([^:]+):([^@]+)@([^:]+):(\d+)$/;
    const match = randomProxy.match(proxyRegex);

    if (!match) {
      console.error(`Некорректный формат прокси: ${randomProxy}`);
      retries--; // Уменьшаем количество попыток
      continue; // Пропускаем некорректный прокси
    }

    const [, , username, password, hostname, port] = match;
    const agent = new HttpsProxyAgent(`http://${username}:${password}@${hostname}:${port}`);

    const config = {
      httpsAgent: agent,
    };

    const url = `https://be.rivalz.ai/api-v1/orbit-db/total-node-info/${address}`;

    try {
      const response = await axios.get(url, config);

      if (response.status === 200) {
        const totalCurrentPoint = response.data.data.totalCurrentPoint;
        const message = `Адрес: ${address}, Прокси: ${randomProxy}, Очки: ${totalCurrentPoint}`;
        console.log(message);

        // Отправляем результат в Telegram
        sendToTelegram(message);

        // Сохраняем результат в файл
        saveToFile(address, totalCurrentPoint);

        return; // Выход из цикла, если запрос прошел успешно
      } else {
        console.error(`Не удалось получить очки для адреса ${address}. Ответ от API:`, response.data);
        sendToTelegram(`Не удалось получить очки для адреса ${address}. Ответ от API: ${JSON.stringify(response.data)}`);
        return; // Не повторяем запрос, если получен некорректный ответ от сервера
      }
    } catch (error) {
      console.error(`Ошибка с прокси ${randomProxy}: ${error.message}`);
      retries--; // Уменьшаем количество попыток при неудачном запросе
    }
  }

  console.error(`Не удалось получить очки для адреса ${address} после нескольких попыток.`);
  sendToTelegram(`Не удалось получить очки для адреса ${address} после нескольких попыток.`);
}

// Асинхронная функция для запуска парсера
async function parseAllAddresses() {
  for (const address of addresses) {
    await getNodeInfoWithProxy(address);
  }
}

// Запускаем парсер
parseAllAddresses();

// Устанавливаем повтор каждые 12 часов
setInterval(parseAllAddresses, intervalMilliseconds);
