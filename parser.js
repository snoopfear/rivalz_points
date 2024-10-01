const fs = require('fs');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const HttpsProxyAgent = require('https-proxy-agent'); // Убедитесь, что библиотека импортирована правильно

// Укажите токен вашего бота и чат ID
const TELEGRAM_TOKEN = '6769297888:AAFOeaKmGtsSSAGsSVGN-x3I1v_VQyh140M';
const CHAT_ID = '257319019'; // ID вашего чата или группы
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Чтение адресов и прокси из файлов
const addresses = fs.readFileSync('address.txt', 'utf8').split('\n').filter(Boolean);
let proxies = fs.readFileSync('proxies.txt', 'utf8').split('\n').filter(Boolean);

// Настраиваемый интервал времени между повторениями (в часах)
let hoursInterval = 12; // Можно изменить значение на нужное количество часов
const intervalMilliseconds = hoursInterval * 60 * 60 * 1000;

// Функция для отправки сообщения в Telegram
function sendToTelegram(message) {
  bot.sendMessage(CHAT_ID, message).catch((err) => {
    console.error('Ошибка отправки сообщения в Telegram:', err.message);
  });
}

// Функция для выполнения запроса с использованием прокси
async function getNodeInfoWithProxy(address) {
  let proxyIndex = 0; // Индекс текущего прокси
  while (proxyIndex < proxies.length) {
    const proxy = proxies[proxyIndex].trim(); // Берем текущий прокси из списка
    const proxyParts = proxy.split(':'); // Разделяем прокси на составляющие
    if (proxyParts.length !== 4) {
      console.error(`Некорректный формат прокси: ${proxy}`);
      proxyIndex++; // Переходим к следующему прокси
      continue; // Пропускаем некорректный прокси
    }

    const [hostname, port, username, password] = proxyParts;

    // Создаем агент для прокси
    const agent = new HttpsProxyAgent(`http://${username}:${password}@${hostname}:${port}`);

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
      proxyIndex++; // Переходим к следующему прокси
    }
  }

  // Если все прокси не сработали, отправляем уведомление
  sendToTelegram(`Не удалось получить данные для адреса ${address} с использованием доступных прокси.`);
}

// Асинхронная функция для запуска парсера
async function parseAllAddresses() {
  for (const address of addresses) {
    await getNodeInfoWithProxy(address); // Здесь добавлена закрывающая скобка
  }
}

// Запускаем парсер с заданным интервалом
setInterval(parseAllAddresses, intervalMilliseconds);

// Первый запуск парсера
parseAllAddresses().catch(console.error);
