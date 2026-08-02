// Inline keyboards (buttons) used throughout the bot.
// @maxhub/max-bot-api expects attachments of type 'inline_keyboard'.

const kb = (buttons) => [{ type: 'inline_keyboard', payload: { buttons } }];

export const MainKeyboards = {
  getMainKeyboard() {
    return kb([
      [
        { type: 'callback', text: '💬 AI-чат', payload: 'start_chat' },
        { type: 'callback', text: 'ℹ️ О боте', payload: 'show_info' },
      ],
      [
        { type: 'callback', text: '⚙️ Настройки', payload: 'show_settings' },
        { type: 'callback', text: '👑 Админка', payload: 'show_admin' },
      ],
    ]);
  },

  getChatKeyboard() {
    return kb([
      [
        { type: 'callback', text: '📈 Тренды', payload: 'show_trends' },
        { type: 'callback', text: '💡 Примеры', payload: 'show_examples' },
      ],
      [
        { type: 'callback', text: '🔍 Новый поиск', payload: 'search_news' },
        { type: 'callback', text: '🏠 В меню', payload: 'back_to_main' },
      ],
    ]);
  },

  getCategoryKeyboard() {
    return kb([
      [
        { type: 'callback', text: '💻 Технологии', payload: 'cat_tech' },
        { type: 'callback', text: '⚽ Спорт', payload: 'cat_sports' },
      ],
      [
        { type: 'callback', text: '🏛 Политика', payload: 'cat_politics' },
        { type: 'callback', text: '💼 Бизнес', payload: 'cat_business' },
      ],
      [
        { type: 'callback', text: '🔬 Наука', payload: 'cat_science' },
        { type: 'callback', text: '🌍 Мир', payload: 'cat_world' },
      ],
      [{ type: 'callback', text: '🏠 В меню', payload: 'back_to_main' }],
    ]);
  },

  getSettingsKeyboard(notificationsOn) {
    const notifText = notificationsOn
      ? '🔔 Уведомления: Вкл'
      : '🔕 Уведомления: Выкл';
    return kb([
      [{ type: 'callback', text: notifText, payload: 'toggle_notifications' }],
      [
        { type: 'callback', text: '🎨 Сменить тему', payload: 'change_theme' },
        { type: 'callback', text: '📊 Статистика', payload: 'show_stats' },
      ],
      [{ type: 'callback', text: '🏠 В меню', payload: 'back_to_main' }],
    ]);
  },

  getAdminKeyboard() {
    return kb([
      [
        { type: 'callback', text: '📊 Статистика', payload: 'admin_stats' },
        { type: 'callback', text: '📢 Рассылка', payload: 'admin_broadcast' },
      ],
      [
        { type: 'callback', text: '⚙️ Управление', payload: 'admin_manage' },
        { type: 'callback', text: '🏠 В меню', payload: 'back_to_main' },
      ],
    ]);
  },
};
