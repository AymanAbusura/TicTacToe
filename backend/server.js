const express = require('express');
const cors = require('cors');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const userCodes = new Map();

function generateUserCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (userCodes.has(code));
  
  return code;
}
function generatePromoCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function sendTelegramMessage(message, chatId) {
  if (!BOT_TOKEN || !chatId) {
    console.error('Telegram credentials not configured or chatId missing');
    return { success: false, error: 'Bot not configured or chatId missing' };
  }

  try {
    const response = await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML'
    });

    return { success: true, data: response };
  } catch (error) {
    console.error('Error sending Telegram message:', error.message);
    return { success: false, error: error.message };
  }
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'Пользователь';
  
  const userCode = generateUserCode();
  
  userCodes.set(userCode, chatId);
  
  const welcomeMessage = `
Привет, ${userName}! 👋

Добро пожаловать в игру "Крестики-нолики"! 🎮

<b>Ваш персональный код:</b>
<code>${userCode}</code>

📝 <b>Как начать играть:</b>
1. Скопируйте код выше
2. Откройте игру
3. Введите код в поле "Код из бота"
4. Начните играть!

🎁 За каждую победу вы получите промокод на скидку!

Удачи! 💪✨
  `.trim();
  
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
  
  console.log(`Generated code ${userCode} for chat ${chatId}`);
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Tic-Tac-Toe Backend API',
    botConfigured: !!(BOT_TOKEN),
    activeCodes: userCodes.size
  });
});

app.post('/api/verify-code', (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ 
      success: false, 
      error: 'Код не указан' 
    });
  }
  
  const upperCode = code.toUpperCase();
  
  if (userCodes.has(upperCode)) {
    const chatId = userCodes.get(upperCode);
    
    sendTelegramMessage(
      '✅ <b>Подключение успешно!</b>\n\nВы можете начать играть. Удачи! 🎮',
      chatId
    );
    
    return res.json({ 
      success: true, 
      message: 'Код подтвержден' 
    });
  } else {
    return res.json({ 
      success: false, 
      error: 'Неверный код. Отправьте /start боту для получения нового кода.' 
    });
  }
});

app.post('/api/game/result', async (req, res) => {
  const { result, promoCode, userCode } = req.body;

  if (!userCode) {
    return res.status(400).json({ error: 'userCode is required' });
  }
  
  const upperCode = userCode.toUpperCase();
  
  if (!userCodes.has(upperCode)) {
    return res.status(400).json({ error: 'Invalid user code' });
  }
  
  const chatId = userCodes.get(upperCode);
  let message = '';

  switch(result) {
    case 'win':
      if (!promoCode) {
        return res.status(400).json({ error: 'Promo code required for win' });
      }
      message = `🎉 <b>Поздравляем с победой!</b>\n\n🎁 Ваш промокод: <code>${promoCode}</code>\n\nСкопируйте его и используйте при оформлении заказа!`;
      break;
    case 'lose':
      message = '😔 <b>Проигрыш</b>\n\nНе расстраивайтесь! Попробуйте ещё раз — у вас обязательно получится! 💪';
      break;
    case 'draw':
      message = '🤝 <b>Ничья!</b>\n\nОтличная игра! Сыграйте ещё раз для новой попытки выиграть промокод.';
      break;
    default:
      return res.status(400).json({ error: 'Invalid result type' });
  }

  const telegramResult = await sendTelegramMessage(message, chatId);
  res.json(telegramResult);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 Bot is ${BOT_TOKEN ? 'configured' : 'NOT configured'}`);
});