const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('Telegram bot token is missing in .env');
  process.exit(1);
}

function generatePromoCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function sendTelegramMessage(chatId, message) {
  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
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

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Tic-Tac-Toe Backend API', botConfigured: !!BOT_TOKEN });
});

app.post('/api/test-chat', async (req, res) => {
  const { chatId } = req.body;
  if (!chatId) return res.status(400).json({ success: false, error: 'chatId is required' });

  try {
    const result = await sendTelegramMessage(chatId, "👋 Пожалуйста, отправьте /start нашему боту для получения промокодов.");
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/generate-promo', (req, res) => {
  const promoCode = generatePromoCode();
  res.json({ promoCode });
});

app.post('/api/game/result', async (req, res) => {
  const { result, promoCode, chatId } = req.body;

  if (!chatId) {
    return res.status(400).json({ error: 'chatId is required' });
  }

  let message = '';
  switch(result) {
    case 'win':
      if (!promoCode) return res.status(400).json({ error: 'Promo code required for win' });
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

  const telegramResult = await sendTelegramMessage(chatId, message);
  res.json(telegramResult);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Bot configured: ${!!BOT_TOKEN}`);
});