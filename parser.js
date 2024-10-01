const fs = require('fs');
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
const { Telegraf } = require('telegraf'); // Убедитесь, что Telegraf установлен

const TELEGRAM_BOT_TOKEN = '6769297888:AAFOeaKmGtsSSAGsSVGN-x3I1v_VQyh140M';
const CHAT_ID = '257319019'; // ID вашего чата или группы
const PROXY_LIST = 'proxies.txt'; // Список прокси
const ADDRESS_FILE = 'address.txt'; // Файл с адресами
const RETRY_INTERVAL = 0.01 * 60 * 60 * 1000; // 12 часов в миллисекундах

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Чтение адресов из файла
async function readAddresses() {
    const data = await fs.promises.readFile(ADDRESS_FILE, 'utf-8');
    return data.split('\n').filter(Boolean);
}

// Функция для отправки сообщений в Telegram
async function sendTelegramMessage(message) {
    await bot.telegram.sendMessage(CHAT_ID, message);
}

// Функция для получения информации о ноде с использованием прокси
async function getNodeInfoWithProxy(address, proxyUrl) {
    // Создание агента для прокси
    const agent = new HttpsProxyAgent(proxyUrl.replace(/@/, ':')); // Заменить @ на %40 для корректного использования

    try {
        const response = await axios.get(`https://be.rivalz.ai/api-v1/orbit-db/total-node-info/${address}`, {
            httpsAgent: agent
        });
        return response.data; // Вернуть данные
    } catch (error) {
        console.error(`Ошибка при получении данных для ${address} через прокси ${proxyUrl}:`, error.message);
        return null; // Возврат null в случае ошибки
    }
}

// Основная функция для парсинга адресов
async function parseAllAddresses() {
    const addresses = await readAddresses();
    const results = [];

    for (const address of addresses) {
        let validProxy = null;
        for (const proxy of PROXY_LIST) {
            const data = await getNodeInfoWithProxy(address, proxy);
            if (data) {
                results.push({ address, totalCurrentPoint: data.totalCurrentPoint });
                validProxy = proxy; // Найден рабочий прокси
                break; // Прекратить поиск, если прокси работает
            }
        }

        if (!validProxy) {
            console.error(`Все прокси не сработали для ${address}`);
        }
    }

    // Отправка результатов в Telegram
    await sendTelegramMessage(JSON.stringify(results, null, 2));
}

// Запуск парсера с заданным интервалом
setInterval(parseAllAddresses, RETRY_INTERVAL);

// Первый запуск
parseAllAddresses().catch(console.error);
