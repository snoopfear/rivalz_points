const fs = require('fs');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Укажите токен вашего бота и чат ID
const TELEGRAM_TOKEN = '6769297888:AAFOeaKmGtsSSAGsSVGN-x3I1v_VQyh140M';
const CHAT_ID = '257319019'; // ID вашего чата или группы
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Чтение адресов и прокси из файлов
const addresses = fs.readFileSync('address.txt', 'utf8').split('\n').filter(Boolean);
let proxies = fs.readFileSync('proxies.txt', 'utf8').split('\n').filter(Boolean);

// Конфигурация для включения/отключения функций
const SEND_TO_TELEGRAM = true; // Измените на false, чтобы отключить отправку в Telegram
const SAVE_TO_FILE = true;     // Измените на false, чтобы отключить сохранение в файл

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
    const message = `${address} ${points}`; // Формат: адрес и количество очков через пробел
    fs.appendFileSync('results.txt', message + '\n', (err) => {
      if (err) {
        console.error('Ошибка сохранения в файл:', err.message);
      }
    });
  }
}

// Функция для выполнения запроса с использованием прокси
async function getNodeInfoWithProxy(address) {
  // Случайный выбор прокси
  const randomProxy = proxies[Math.floor(Math.random() * proxies.length)].trim();

  // Проверяем, соответствует ли прокси ожидаемому формату
  const proxyRegex = /^(http:\/\/)?([^:]+):([^@]+)@([^:]+):(\d+)$/; // Регулярное выражение для проверки формата
  const match = randomProxy.match(proxyRegex);

  if (!match) {
    console.error(`Некорректный формат прокси: ${randomProxy}`);
    return; // Прерываем выполнение функции, если прокси некорректный
  }

  // Извлекаем данные из регулярного выражения
  const [, , username, password, hostname, port] = match;

  // Создаем агент для прокси
  const agent = new HttpsProxyAgent(`http://${username}:${password}@${hostname}:${port}`);

  const config = {
    httpsAgent: agent,
  };

  const url = `https://be.rivalz.ai/api-v1/orbit-db/total-node-info/${address}`;

  try {
    const response = await axios.get(url, config);

    // Проверяем, вернулся ли корректный ответ
    if (response.status === 200) {
      const totalCurrentPoint = response.data.data.totalCurrentPoint; // Изменили путь к значению
      const message = `Адрес: ${address}, Прокси: ${randomProxy}, Очки: ${totalCurrentPoint}`;
      console.log(message);

      // Отправляем результат в Telegram (если включено)
      sendToTelegram(message);

      // Сохраняем результат в файл (если включено)
      saveToFile(address, totalCurrentPoint);
    } else {
      console.error(`Не удалось получить очки для адреса ${address}. Ответ от API:`, response.data);
      const errorMessage = `Не удалось получить очки для адреса ${address}. Ответ от API: ${JSON.stringify(response.data)}`;
      sendToTelegram(errorMessage);
    }
  } catch (error) {
    console.error(`Ошибка с прокси ${randomProxy}: ${error.message}`);
  }
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
