// const TelegramBot = require('node-telegram-bot-api');
'use strict';

const storage = require('node-persist');
const {TextCommand, Telegram} = require('telegram-node-bot');

const Controller = require('./src/controller');

require('dotenv').config();

storage.initSync();


const {TOKEN, HOST, PORT} = process.env;

const tg = new Telegram(TOKEN, {
  webhook: {
    url: 'https://35bf7e0a.ngrok.io/monitor',
    port: PORT,
    host: HOST
  }
});

const controller = new Controller(storage);
tg.router
  .when(new TextCommand('/cities', 'citiesHandler'), controller)
  .when(new TextCommand('/tickets', 'ticketsHandler'), controller)
  .when(new TextCommand('/notifications', 'notificationsHandler'), controller)
  .when(new TextCommand('/monitor', 'monitorHandler'), controller)
;

// tg.onMaster(() => {
//   monitor();
// });