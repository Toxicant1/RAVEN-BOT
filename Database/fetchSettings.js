// fetchSettings.js (Raven version – hardcoded)

async function fetchSettings() {
  return {
    wapresence: 'recording',     // Bot shows "recording" as online status
    autoread: 'on',              // Auto-reads chats
    mode: 'public',              // Raven is public by default
    prefix: '.',                 // Commands use . prefix like .menu, .help
    autolike: 'on',              // Auto-likes status
    autoview: 'on',              // Auto-views status
    antilink: 'on',              // Blocks WhatsApp links
    antilinkall: 'off',          // Blocks all links (currently disabled)
    antidelete: 'on',            // Recovers deleted messages
    antitag: 'on',               // Blocks tags like @everyone
    antiforeign: 'off',          // Allows foreign numbers
    antibot: 'off',              // Allows other bots
    welcomegoodbye: 'on',        // Sends welcome/goodbye messages
    autobio: 'off',              // Bio update disabled
    badword: 'off',              // Badword filter disabled
    gptdm: 'off',                // GPT in DM disabled by default
    anticall: 'on'               // Blocks incoming calls
  };
}

module.exports = fetchSettings;