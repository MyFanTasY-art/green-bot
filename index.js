const TelegramBot = require('node-telegram-bot-api');
const token = '7712573366:AAFzq92zbklmOYMidLtdnV-Z_HsWmoh68a0';
// Создаем экземпляр бота
const bot = new TelegramBot(token, { polling: true });

// Настройки для хранения данных о товарах и корзинах пользователей
let catalog = {
  various_bouquets: [
    { id: 1, name: 'Букет 1', description: 'Описание букета 1', price: 1000, photo: 'http://florist38.ru/sources/upload/shop/616_preview.jpg' },
    { id: 2, name: 'Букет 2', description: 'Описание букета 2', price: 1500, photo: 'https://content2.flowwow-images.com/data/flowers/262x262/08/1627974308_18563708.jpg' }
  ],
  roses_bouquets: [],
  lilies_bouquets: [],
  daisies_bouquets: []
};

let userCarts = {};

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  
  // Приветственное сообщение
  bot.sendMessage(chatId, `Привет, ${firstName}! Добро пожаловать в наш магазин цветов.`);
  
  // Отправляем меню каталога
  sendCatalogMenu(chatId);
});

// Функция отправки меню каталога
function sendCatalogMenu(chatId) {
  let menuKeyboard = [
    [{ text: 'Каталог', callback_data: 'open_catalog' }]
  ];
  
  bot.sendMessage(chatId, 'Выберите категорию:', {
    reply_markup: {
      inline_keyboard: menuKeyboard
    }
  });
}

// Обработка нажатий на кнопки в инлайн-клавиатуре
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  switch(data) {
    case 'open_catalog':
      openCatalog(chatId);
      break;
    case 'back_to_categories':
      openCatalog(chatId);
      break;
    case 'view_cart':
      viewCart(chatId);
      break;
    case 'checkout':
      orderForm(chatId);
      break;
    default:
      if (data.startsWith('view_category_')) {
        viewCategory(chatId, data.replace('view_category_', ''));
      } else if (data.startsWith('select_bouquet_')) {
        selectBouquet(chatId, data.replace('select_bouquet_', ''));
      } else if (data.startsWith('add_to_cart_')) {
        addToCart(chatId, data.replace('add_to_cart_', ''));
      } else {
        bot.answerCallbackQuery(callbackQuery.id, 'Что-то пошло не так...');
      }
  }
});

// Открытие каталога
function openCatalog(chatId) {
  let categories = ['various_bouquets', 'roses_bouquets', 'lilies_bouquets', 'daisies_bouquets'];
  
  let keyboard = categories.map(category => ({
    text: category,
    callback_data: `view_category_${category}`
  }));
  
  keyboard.push({ text: 'Корзина', callback_data: 'view_cart' });
  
  bot.sendMessage(chatId, 'Выберите категорию:', {
    reply_markup: {
      inline_keyboard: [keyboard]
    }
  });
}

// Просмотр категории
function viewCategory(chatId, category) {
  let bouquets = catalog[category];
  
  if (!bouquets.length) {
    return bot.sendMessage(chatId, 'В данной категории пока нет товаров.');
  }
  
  let keyboard = [];
  
  for (let i = 0; i < bouquets.length; i++) {
    let bouquet = bouquets[i];
    keyboard.push([
      { text: `${bouquet.name} (${bouquet.price} руб.)`, callback_data: `select_bouquet_${bouquet.id}` },
      { text: `Купить ${bouquet.name}`, callback_data: `add_to_cart_${bouquet.id}` }
    ]);
  }
  
  keyboard.push([{ text: 'Назад', callback_data: 'back_to_categories' }]);
  
  bot.sendMessage(chatId, 'Список букетов:', {
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
}

// Выбор букета
function selectBouquet(chatId, bouquetId) {
  let foundBouquet = null;
  
  for (let category in catalog) {
    let bouquets = catalog[category];
    
    for (let i = 0; i < bouquets.length; i++) {
      if (bouquets[i].id == bouquetId) {
        foundBouquet = bouquets[i];
        break;
      }
    }
  }
  
  if (foundBouquet) {
    let keyboard = [
      [{ text: 'Вернуться назад', callback_data: 'back_to_categories' }],
      [{ text: 'Добавить в корзину', callback_data: `add_to_cart_${foundBouquet.id}` }]
    ];
    
    bot.sendPhoto(chatId, foundBouquet.photo, {
      caption: `${foundBouquet.name}\nЦена: ${foundBouquet.price} руб.\nОписание: ${foundBouquet.description}`,
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  } else {
    bot.sendMessage(chatId, 'Не удалось найти указанный букет.');
  }
}

// Добавление товара в корзину
function addToCart(chatId, bouquetId) {
  if (!userCarts[chatId]) {
    userCarts[chatId] = [];
  }
  
  let foundBouquet = null;
  
  for (let category in catalog) {
    let bouquets = catalog[category];
    
    for (let i = 0; i < bouquets.length; i++) {
      if (bouquets[i].id == bouquetId) {
        foundBouquet = bouquets[i];
        break;
      }
    }
  }
  
  if (foundBouquet) {
    userCarts[chatId].push(foundBouquet);
    bot.sendMessage(chatId, `Товар "${foundBouquet.name}" добавлен в корзину.`);
  } else {
    bot.sendMessage(chatId, 'Не удалось найти указанный букет.');
  }
}

// Просмотр содержимого корзины
function viewCart(chatId) {
  let cartItems = userCarts[chatId] || [];
  
  if (!cartItems.length) {
    return bot.sendMessage(chatId, 'Ваша корзина пуста.');
  }
  
  let totalPrice = 0;
  let message = 'Ваша корзина:\n\n';
  
  for (let item of cartItems) {
    message += `- ${item.name}: ${item.price} руб.\n`;
    totalPrice += item.price;
  }
  
  message += `\nИтого: ${totalPrice} руб.`;
  
  let keyboard = [
    [{ text: 'Оформить заказ', callback_data: 'checkout' }]
  ];
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
}

// Форма заказа
function orderForm(chatId) {
  bot.sendMessage(chatId, 'Укажите адрес доставки:');
}

// Получение адреса доставки
bot.on('text', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (text.includes('Адрес доставки')) {
    bot.sendMessage(chatId, 'Теперь укажите ваш контактный номер телефона:');
  } else if (text.includes('Контактный номер телефона')) {
    bot.sendMessage(chatId, 'Ваш заказ принят! Ожидайте подтверждения от наших менеджеров.');
    
    // Логика отправки SMS и уведомления всех администраторов
    notifyAdmins(chatId, msg);
  }
});

// Уведомление администраторов о новом заказе
function notifyAdmins(chatId, msg) {
  // Здесь должна быть логика отправки уведомлений администраторам
  console.log(`Новый заказ от пользователя с ID: ${chatId}`);
}

// Команда для добавления нового товара в каталог
bot.onText(/\/add_product/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, 'Отправьте мне следующую информацию через пробел: Название Цена Описание Категория ФотоURL');
});

// Обработка ввода информации о товаре
bot.on('text', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (text.startsWith('/add_product')) {
    const productInfo = text.split(' ');
    
    if (productInfo.length !== 6) {
      return bot.sendMessage(chatId, 'Некорректная информация о товаре. Попробуйте еще раз.');
    }
    
    const [command, name, price, description, category, photoUrl] = productInfo;
    
    if (!catalog[category]) {
      catalog[category] = [];
    }
    
    const newProduct = {
      id: Date.now(),
      name,
      price: parseInt(price),
      description,
      photo: photoUrl
    };
    
    catalog[category].push(newProduct);
    
    bot.sendMessage(chatId, `Товар "${name}" успешно добавлен в категорию "${category}".`);
  }
});

// Запуск бота
bot.startPolling();
