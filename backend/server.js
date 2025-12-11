const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

function generatePromoCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Tic-Tac-Toe Backend API',
    botConfigured: !!(BOT_TOKEN && ADMIN_CHAT_ID)
  });
});

app.post('/api/generate-promo', (req, res) => {
  const promoCode = generatePromoCode();
  res.json({ promoCode });
});

app.post('/api/game/win', async (req, res) => {
  const { promoCode } = req.body;
  
  if (!promoCode) {
    return res.status(400).json({ error: 'Promo code is required' });
  }

  const message = `🎉 <b>Победа!</b>\nПромокод выдан: <code>${promoCode}</code>`;
  const result = await sendTelegramMessage(message);
  
  res.json(result);
});

app.post('/api/game/lose', async (req, res) => {
  const message = '😔 <b>Проигрыш</b>';
  const result = await sendTelegramMessage(message);
  
  res.json(result);
});

app.post('/api/game/draw', async (req, res) => {
  const message = '🤝 <b>Ничья</b>';
  const result = await sendTelegramMessage(message);
  
  res.json(result);
});

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Bot configured: ${!!(BOT_TOKEN && ADMIN_CHAT_ID)}`);
});