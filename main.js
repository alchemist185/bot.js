const {
  Client,
  GatewayIntentBits,
  ActivityType,
  AttachmentBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// === CONFIG ===
const token = 'MTM3OTk2MzQ3MzAxNDAzMDM5Nw.GWZdn4.0hPx84d7xAGxpTi-Svcv759kpPw1VvPLIXeFNo'; // Your bot token
const prefix = '!a';
const ownerId = '1366920828356399276';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.blacklistedUsers = new Set();
client.blacklistedGuilds = new Set();

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: `!a obscuate | ${client.guilds.cache.size} servers`,
      type: ActivityType.Playing
    }]
  });
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(prefix)) return;
  if (client.blacklistedUsers.has(message.author.id)) return;
  if (client.blacklistedGuilds.has(message.guildId)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  // == Obfuscate Command ==
  if (command === 'obscuate') {
    if (args.length === 0 && message.attachments.size === 0) {
      return message.reply('⚠️ Provide code or attach a file.');
    }

    let code = args.join(' ');

    if (!code && message.attachments.size > 0) {
      const attachment = message.attachments.first();
      const fileData = await fetch(attachment.url).then(res => res.text());
      code = fileData;
    }

    const obfuscated = `-- Obfuscated with Alchemist\nloadstring(game:HttpGet("data:text/plain;base64,${Buffer.from(code).toString('base64')}"))()`;

    const filePath = path.join(__dirname, 'obfuscated.lua');
    fs.writeFileSync(filePath, obfuscated);
    const file = new AttachmentBuilder(filePath);

    try {
      await message.author.send({
        content: '🔐 Obfuscated code:',
        files: [file]
      });
      await message.reply('📬 Sent obfuscated file to your DMs.');
    } catch {
      await message.reply('❌ Could not send DM. Please check your privacy settings.');
    }

    fs.unlinkSync(filePath);
  }

  // == Blacklist Commands (owner only) ==
  if (message.author.id === ownerId) {
    if (command === 'blacklist') {
      const id = args[0];
      if (!id) return message.reply('⚠️ Provide a user or guild ID.');
      if (id.length === 18) {
        client.blacklistedUsers.add(id);
        message.reply(`🔒 User \`${id}\` blacklisted.`);
      } else {
        client.blacklistedGuilds.add(id);
        message.reply(`🔒 Guild \`${id}\` blacklisted.`);
      }
    }

    if (command === 'unblacklist') {
      const id = args[0];
      if (!id) return message.reply('⚠️ Provide a user or guild ID.');
      client.blacklistedUsers.delete(id);
      client.blacklistedGuilds.delete(id);
      message.reply(`🔓 ID \`${id}\` unblacklisted.`);
    }
  }
});

client.login(token);
