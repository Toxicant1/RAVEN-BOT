const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
} = require("@whiskeysockets/baileys");

const P = require("pino");
const fs = require("fs");
const path = require("path");

// Load settings
const settings = require("../lib/settings.json");
console.log("😴 settings object:", settings);

// Emoji loop for auto-like status
const emojiLoop = ["🤖", "❤️", "🦅", "🔥", "👑", "🖤"];
let emojiIndex = 0;

const sessionPath = path.join(__dirname, "../session");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const store = makeInMemoryStore({ logger: P().child({ level: "silent", stream: "store" }) });
  store.readFromFile("./store.json");
  setInterval(() => store.writeToFile("./store.json"), 10_000);

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Using WA v${version.join(".")}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    printQRInTerminal: true,
    auth: state,
    browser: ["RavenBot", "Desktop", "5.0"],
    defaultQueryTimeoutMs: undefined,
    getMessage: async (key) => {
      return { conversation: "🧠 Raven is processing..." };
    },
  });

  store.bind(sock.ev);

  // Presence
  if (settings.wapresence === "recording") {
    setInterval(() => {
      sock.sendPresenceUpdate("recording", sock.user.id);
    }, 30_000);
  }

  // Autobio (with emoji loop)
  if (settings.autobio === "on") {
    setInterval(async () => {
      try {
        const emoji = emojiLoop[emojiIndex];
        await sock.updateProfileStatus(`Raven bot active ${emoji}`);
        emojiIndex = (emojiIndex + 1) % emojiLoop.length;
      } catch (e) {
        console.log("⚠️ Failed to update autobio:", e);
      }
    }, 40_000);
  }

  // Connection updates
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("🦅 Raven connected successfully.");
    } else if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

      if (reason === DisconnectReason.loggedOut) {
        console.log("📴 Session expired. Please scan QR again.");
        fs.rmSync(sessionPath, { recursive: true, force: true });
        process.exit(1);
      } else {
        console.log("🔁 Reconnecting Raven...");
        startBot();
      }
    }
  });

  // Save creds on update
  sock.ev.on("creds.update", saveCreds);
}

// Start the bot
startBot();