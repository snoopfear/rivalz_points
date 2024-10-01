const fs = require('fs');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const HttpsProxyAgent = require('https-proxy-agent');

// Укажите токен вашего бота и чат ID
const TELEGRAM_TOKEN = '6769297888:AAFOeaKmGtsSSAGsSVGN-x3I1v_VQyh140M';
const CHAT_ID = '257319019'; // ID вашего чата или группы
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Чтение адресов и прокси из файлов
const addresses = fs.readFileSync('address.txt', 'utf8').split('\n').filter(Boolean);
let proxies = fs.readFileSync('proxies.txt', 'utf8').split('\n').filter(Boolean);

// Настраиваемый интервал времени между повторениями (в часах)
const hoursInterval = 0.01; // Вы можете изменить значение на нужное количество часов

// Преобразуем часы в миллисекунды для setInterval
const intervalMilliseconds = hoursInterval * 60 * 60 * 1000;

// Функция для отправки сообщения в Telegram
function sendToTelegram(message) {
  bot.sendMessage(CHAT_ID, message).catch((err) => {
    console.error('Ошибка отправки сообщения в Telegram:', err.message);
  });
}

// Функция для выполнения запроса с использованием прокси
async function getNodeInfoWithProxy(address) {
  while (proxies.length > 0) {
    const proxy = proxies.shift(); // Берем первый прокси из списка
    const proxyUrl = new URL(proxy);

    const agent = new HttpsProxyAgent({
      host: proxyUrl.hostname,
      port: proxyUrl.port,
      auth: `${proxyUrl.username}:${proxyUrl.password}`,
    });

    const config = {
      httpsAgent: agent,
    };

    const url = `https://be.rivalz.ai/api-v1/orbit-db/total-node-info/${address}`;

    try {
      const response = await axios.get(url, config);
      const totalCurrentPoint = response.data.totalCurrentPoint;
      console.log(`Адрес: ${address}, Прокси: ${proxy}, Очки: ${totalCurrentPoint}`);

      // Отправляем результат в Telegram
      sendToTelegram(`Адрес: ${address}, TotalCurrentPoint: ${totalCurrentPoint}`);
      return; // Если запрос прошел успешно, выходим из цикла
    } catch (error) {
      console.error(`Ошибка с прокси ${proxy}: ${error.message}`);
      if (proxies.length === 0) {
        proxies = fs.readFileSync('proxies.txt', 'utf8').split('\n').filter(Boolean); // Перезагружаем список прокси
      }
    }
  }
}

// Асинхронная функция для запуска парсера
async function parseAllAddresses() {
  for (const address of addresses) {
    await getNodeInfoWithProxy(address
