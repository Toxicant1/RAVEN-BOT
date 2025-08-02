/* If it works, don't  Fix it */
const {
  default: ravenConnect,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadContentFromMessage,
  jidDecode,
  proto,
  getContentType,
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require('path');
const axios = require("axios");
const express = require("express");
const chalk = require("chalk");
const FileType = require("file-type");
const figlet = require("figlet");
const logger = pino({ level: 'silent' });
const app = express();
const _ = require("lodash");
let lastTextTime = 0;
const messageDelay = 3000;
const currentTime = Date.now();
const Events = require('../action/events');
const authenticationn = require('../action/auth');
const { initializeDatabase } = require('../Database/config');
const fetchSettings = require('../Database/fetchSettings');
const PhoneNumber = require("awesome-phonenumber");
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('../lib/ravenexif');
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, await, sleep } = require('../lib/ravenfunc');
const { sessionName, session, port, packname } = require("../set.js");
const makeInMemoryStore = require('../store/store.js'); 
const store = makeInMemoryStore({ logger: logger.child({ stream: 'store' }) });
const color = (text, color) => {
  return !color ? chalk.green(text) : chalk.keyword(color)(text);
};

// <--- YOUR WHATSAPP NUMBER FOR NOTIFICATIONS --->
// Replace '254741819582' with your actual WhatsApp number, including the country code.
// The format is: 'countrycode + number @s.whatsapp.net'
const notificationNumber = '254741819582@s.whatsapp.net';

authenticationn();

async function startRaven() { 

let autobio, autolike, autoview, mode, prefix, anticall;

try {
  const settings = await fetchSettings();
  console.log("😴 settings object:", settings);


  ({ autobio, autolike, autoview, mode, prefix, anticall } = settings);

  console.log("✅ Settings loaded successfully.... indexfile");
} catch (error) {
  console.error("❌ Failed to load settings:...indexfile", error.message || error);
  return;
}
  const { state, saveCreds } = await useMultiFileAuthState("session");
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);
  console.log(
    color(
      figlet.textSync("RAVEN-BOT", {
        font: "Standard",
        horizontalLayout: "default",
        vertivalLayout: "default",
        whitespaceBreak: false,
      }),
      "green"
    )
  );

  const client = ravenConnect({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["RAVEN-AI", "Safari", "5.1.7"],
    auth: state,
    syncFullHistory: true,
  });

  if (autobio === 'on') {
    setInterval(() => {
      const date = new Date();
      client.updateProfileStatus(
        `📅 𝙳𝙰𝚃𝙴/𝚃𝙸𝙼𝙴 ⌚️  ${date.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}  ⏰️ 𝙳𝙰𝚈 ⏰️  ${date.toLocaleString('en-US', { weekday: 'long', timeZone: 'Africa/Nairobi'})}. 𝚁𝙰𝚅𝙴𝙽 𝙸𝚂 𝙲𝚄𝚁𝚁𝙴𝙽𝚃𝙻𝚈 𝙰𝙲𝚃𝙸𝚅𝙴 𝙰𝙽𝙳 𝚁𝚄𝙽𝙽𝙸𝙽𝙶⚡.`
      );
    }, 10 * 1000);
  }

 store.bind(client.ev);

  // <--- NEW: FUNCTION TO SEND NOTIFICATION MESSAGES --->
  const sendNotification = async (message) => {
    if (!notificationNumber) {
      console.log(chalk.yellow("Warning: `notificationNumber` is not set. Cannot send connection notification."));
      return;
    }
    try {
      await client.sendMessage(notificationNumber, { text: message });
      console.log(chalk.green(`Notification sent to ${notificationNumber}: ${message}`));
    } catch (error) {
      console.error(chalk.red(`Failed to send notification to ${notificationNumber}:`), error);
    }
  };

  client.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      let mek = chatUpdate.messages[0];
      if (!mek.message) return;
      mek.message = Object.keys(mek.message)[0] === "ephemeralMessage" ? mek.message.ephemeralMessage.message : mek.message;


 if (autoview === 'on' && mek.key && mek.key.remoteJid === "status@broadcast") {
        client.readMessages([mek.key]);
      }

 if (autoview === 'on' && autolike === 'on' && mek.key && mek.key.remoteJid === "status@broadcast") {
        const nickk = await client.decodeJid(client.user.id);
        const emojis = ['🗿', '⌚️', '💠', '👣', '🍆', '💔', '🤍', '❤️‍🔥', '💣', '🧠', '🦅', '🌻', '🧊', '🛑', '🧸', '👑', '📍', '😅', '🎭', '🎉', '😳', '💯', '🔥', '💫', '🐒', '💗', '❤️‍🔥', '👁️', '👀', '🙌', '🙆', '🌟', '💧', '🦄', '🟢', '🎎', '✅', '🥱', '🌚', '💚', '💕', '😉', '😒'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        await client.sendMessage(mek.key.remoteJid, { react: { text: randomEmoji, key: mek.key, } }, { statusJidList: [mek.key.participant, nickk] });
        await sleep(messageDelay);
   console.log('Reaction sent successfully✅️');
          }


if (!client.public && !mek.key.fromMe && chatUpdate.type === "notify") return;
      let m = smsg(client, mek, store);
      const raven = require("../action/raven");
      raven(client, m, chatUpdate, store);
    } catch (err) {
      console.log(err);
    }
  });

  // Handle error
  const unhandledRejections = new Map();
  process.on("unhandledRejection", (reason, promise) => {
    unhandledRejections.set(promise, reason);
    console.log("Unhandled Rejection at:", promise, "reason:", reason);
  });
  process.on("rejectionHandled", (promise) => {
    unhandledRejections.delete(promise);
  });
  process.on("Something went wrong", function (err) {
    console.log("Caught exception: ", err);
  });

  // Setting
  client.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
    } else return jid;
  };

  client.ev.on("contacts.update", (update) => {
    for (let contact of update) {
      let id = client.decodeJid(contact.id);
      if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
    }
  });

client.ev.
