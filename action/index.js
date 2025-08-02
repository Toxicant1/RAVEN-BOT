const {
  default: ravenConnect,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const fs = require('fs');
const path = require('path');

const sessionPath = './session';
const emojiList = ['🔥', '💥', '🌟', '💯', '🚀', '❤️', '🌀'];
let emojiIndex = 0;

const settings = {
  wapresence: 'recording',
  autoread: 'on',
  mode: 'public',
  prefix: '.',
  autolike: 'on',
  autoview: 'on',
  antilink: 'on',
  antilinkall: 'off',
  antidelete: 'on',
  antitag: 'on',
  antiforeign: 'off',
  antibot: 'off',
  welcomegoodbye: 'on',
  autobio: 'on',
  badword: 'off',
  gptdm: 'off',
  anticall: 'on'
};

console.log('😴 settings object:', settings);

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

  const client = ravenConnect({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
    browser: ['Raven Bot', 'Safari', '1.0.0']
  });

  store.bind(client.ev);

  client.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('💔 Disconnected from WhatsApp, reconnecting...', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ WhatsApp bot connected successfully!');

      if (settings.autobio === 'on') {
        setInterval(() => {
          client.updateProfileStatus(`Raven is live 🛰 | ${new Date().toLocaleTimeString()}`);
        }, 60 * 1000); // every 1 minute
      }

      if (settings.autolike === 'on') {
        setInterval(() => {
          emojiIndex = (emojiIndex + 1) % emojiList.length;
          client.updateProfileName(`Raven Bot ${emojiList[emojiIndex]}`);
        }, 15 * 1000); // every 15 seconds
      }
    }
  });

  client.ev.on('creds.update', saveCreds);
}

startBot().catch(err => console.error('🔥 Bot crashed:', err));