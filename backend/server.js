// server.js - Backend для игры Крестики-нолики
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Конфигурация Telegram бота (из переменных окружения)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

// Генерация промокода
function generatePromoCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Отправка сообщения в Telegram
async function sendTelegramMessage(message) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.error('Telegram credentials not configured');
    return { success: false, error: 'Bot not configured' };
  }

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: ADMIN_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      }
    );
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error sending Telegram message:', error.message);
    return { success: false, error: error.message };
  }
}

// API Routes

// Проверка работы сервера
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Tic-Tac-Toe Backend API',
    botConfigured: !!(BOT_TOKEN && ADMIN_CHAT_ID)
  });
});

// Генерация промокода
app.post('/api/generate-promo', (req, res) => {
  const promoCode = generatePromoCode();
  res.json({ promoCode });
});

// Отправка уведомления о победе
app.post('/api/game/win', async (req, res) => {
  const { promoCode } = req.body;
  
  if (!promoCode) {
    return res.status(400).json({ error: 'Promo code is required' });
  }

  const message = `🎉 <b>Победа!</b>\nПромокод выдан: <code>${promoCode}</code>`;
  const result = await sendTelegramMessage(message);
  
  res.json(result);
});

// Отправка уведомления о проигрыше
app.post('/api/game/lose', async (req, res) => {
  const message = '😔 <b>Проигрыш</b>';
  const result = await sendTelegramMessage(message);
  
  res.json(result);
});

// Отправка уведомления о ничьей
app.post('/api/game/draw', async (req, res) => {
  const message = '🤝 <b>Ничья</b>';
  const result = await sendTelegramMessage(message);
  
  res.json(result);
});

// Обработка всех игровых событий одним эндпоинтом
app.post('/api/game/result', async (req, res) => {
  const { result, promoCode } = req.body;
  
  let message = '';
  
  switch(result) {
    case 'win':
      if (!promoCode) {
        return res.status(400).json({ error: 'Promo code required for win' });
      }
      message = `🎉 <b>Победа!</b>\nПромокод выдан: <code>${promoCode}</code>`;
      break;
    case 'lose':
      message = '😔 <b>Проигрыш</b>';
      break;
    case 'draw':
      message = '🤝 <b>Ничья</b>';
      break;
    default:
      return res.status(400).json({ error: 'Invalid result type' });
  }
  
  const telegramResult = await sendTelegramMessage(message);
  res.json(telegramResult);
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Bot configured: ${!!(BOT_TOKEN && ADMIN_CHAT_ID)}`);
});