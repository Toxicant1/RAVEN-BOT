const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');

// === CONFIGURATION ===
const config = {
  BOT_NAME: 'Raven Bot',
  OWNER_NAME: 'Ishaq Ibrahim',
  OWNER_NUMBER: ['254741819582'],
  prefix: '.',
  autoread: true,
  autobio: true,
  autolike: true,
  autoview: true,
  welcome: true,
  antilink: true,
  anticall: true,
  antitag: true
};

// === START FUNCTION ===
async function startBot() {
  const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
  const sessionPath = './session';

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`📡 Using WhatsApp v${version}, isLatest: ${isLatest}`);

  const client = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    browser: ['Raven Bot', 'Chrome', '1.0.0'],
    syncFullHistory: false
  });

  // Reconnect logic
  client.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log(`✅ ${config.BOT_NAME} connected successfully!`);
      await client.sendMessage(config.OWNER_NUMBER[0] + '@s.whatsapp.net', {
        text: `🦅 *${config.BOT_NAME} is now online!*\n\n🧑‍💻 Owner: ${config.OWNER_NAME}\n✅ Status: Connected`
      });
    } else if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log('❌ Logged out. Please rescan QR.');
      } else {
        console.log('⚠️ Disconnected. Reconnecting...');
        startBot(); // auto restart
      }
    }
  });

  // Save credentials on change
  client.ev.on('creds.update', saveCreds);

  // === AUTO BIO ===
  if (config.autobio) {
    setInterval(async () => {
      const time = new Date().toLocaleTimeString();
      await client.updateProfileStatus(`🦅 Raven active at ${time}`);
    }, 30_000);
  }

  // === AUTO LIKE & STATUS EMOJIS ===
  if (config.autolike || config.autoview) {
    client.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (!msg.key.fromMe && msg.message?.protocolMessage?.type === 2) return;
        if (msg.key.remoteJid?.includes('status')) {
          if (config.autoview) {
            await client.readMessages([msg.key]);
          }
          if (config.autolike) {
            const emojiList = ['❤️', '🔥', '😍', '😎', '✨', '💯', '🦅'];
            const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
            await client.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key }});
          }
        }
      }
    });
  }

  // === LOG SETTINGS ===
  console.log(`🔧 Raven Bot Settings:`, {
    wapresence: 'recording',
    autoread: config.autoread ? 'on' : 'off',
    mode: 'public',
    prefix: config.prefix,
    autolike: config.autolike ? 'on' : 'off',
    autoview: config.autoview ? 'on' : 'off',
    antilink: config.antilink ? 'on' : 'off',
    antidelete: 'on',
    antitag: config.antitag ? 'on' : 'off',
    antiforeign: 'off',
    antibot: 'off',
    welcomegoodbye: config.welcome ? 'on' : 'off',
    autobio: config.autobio ? 'on' : 'off',
    badword: 'off',
    gptdm: 'off',
    anticall: config.anticall ? 'on' : 'off'
  });
}

// === RUN THE BOT ===
startBot();