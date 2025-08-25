const Telenode = require("telenode-js");
require("dotenv").config();

const MAX_MESSAGE_LENGTH = 4096;

class TelegramBot {
  instance;
  apiToken;
  chatId;

  constructor() {
    this.apiToken = process.env.TELEGRAM_API_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.instance = new Telenode({ apiToken: this.apiToken });
  }

  async sendMessage(message) {
    if (message.length < MAX_MESSAGE_LENGTH) {
      this.instance.sendTextMessage(message, this.chatId);
    } else {
      for (let i = 0; i < message.length; i += MAX_MESSAGE_LENGTH) {
        const chunk = message.substring(i, i + MAX_MESSAGE_LENGTH);
        await this.instance.sendTextMessage(chunk, this.chatId);
      }
    }
  }
}

const bot = new TelegramBot();
module.exports = bot;
