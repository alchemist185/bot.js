const { Client, GatewayIntentBits, ActivityType, AttachmentBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');

// ===== CONFIGURATION =====
const token = 'YOUR_BOT_TOKEN_HERE';
const prefix = '!a';
const ownerId = 'YOUR_DISCORD_USER_ID_HERE';
const allowedGuildId = '1379252580391059616';

// ===== LUA KEYWORDS =====
const luaKeywords = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
  'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return',
  'then', 'true', 'until', 'while'
]);

function randomIdentifier() {
  return '_' + Math.random().toString(36).slice(2, 10);
}

// ===== LUA OBFUSCATION =====
function obfuscateLua(code) {
  // Remove comments
  code = code
    .replace(/--[\s\S]*?/g, '')      // multi-line --[[ ... ]]
    .replace(/--[^\n\r]*/g, '');             // single-line --

  // Obfuscate string literals
  code = code.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => {
    const inner = match.slice(1, -1);
    const chars = Array.from(inner).map(c => c.charCodeAt(0));
    return `string.char(${chars.join(',')})`;
  });

  // Obfuscate identifiers
  const identifiers = {};
  return code.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (match) => {
    if (luaKeywords.has(match)) return match;
    if (/^(string|table|math|io|os|coroutine|debug)$/.test(match)) return match;
    if (!identifiers[match]) identifiers[match] = randomIdentifier();
    return identifiers[match];
  });
}

// ===== DISCORD CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const blacklistedUsers = new Set();
const blacklistedGuilds = new Set();

// ===== ON READY =====
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: `${prefix} obfuscate | ${client.guilds.cache.size} servers`,
      type: ActivityType.Playing
    }]
  });
});

client.on('guildCreate', () => {
  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: `${prefix} obfuscate | ${client.guilds.cache.size} servers`,
      type: ActivityType.Playing
    }]
  });
});
client.on('guildDelete', () => {
  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: `${prefix} obfuscate | ${client.guilds.cache.size} servers`,
      type: ActivityType.Playing
    }]
  });
});

// ===== MESSAGE HANDLER =====
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;
  if (message.guildId !== allowedGuildId) return; // Only allow in specified server

  if (blacklistedUsers.has(message.author.id) || blacklistedGuilds.has(message.guildId)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ===== OWNER BLACKLIST CONTROLS =====
  if (message.author.id === ownerId) {
    if (command === 'blacklist') {
      const id = args[0];
      if (!id) return message.reply('⚠️ Usage: `!a blacklist <userID|guildID>`');
      if (id.length === 18) {
        blacklistedUsers.add(id);
        return message.reply(`🔒 User \`${id}\` has been blacklisted.`);
      } else {
        blacklistedGuilds.add(id);
        return message.reply(`🔒 Guild \`${id}\` has been blacklisted.`);
      }
    }

    if (command === 'unblacklist') {
      const id = args[0];
      if (!id) return message.reply('⚠️ Usage: `!a unblacklist <userID|guildID>`');
      blacklistedUsers.delete(id);
      blacklistedGuilds.delete(id);
      return message.reply(`🔓 ID \`${id}\` has been unblacklisted.`);
    }
  }

  // ===== OBFUSCATE COMMAND =====
  if (command === 'obfuscate') {
    let code = args.join(' ');

    if (!code && message.attachments.size > 0) {
      const attachment = message.attachments.first();
      try {
        const response = await fetch(attachment.url);
        code = await response.text();
      } catch {
        return message.reply('❌ Failed to download attachment.');
      }
    }

    if (!code) return message.reply('⚠️ Provide code inline or attach a Lua file.');

    let obfuscated;
    try {
      obfuscated = obfuscateLua(code);
    } catch (err) {
      return message.reply('❌ Obfuscation failed. Invalid code or internal error.');
    }

    const filePath = path.join(__dirname, `obfuscated_${Date.now()}.lua`);
    fs.writeFileSync(filePath, obfuscated);
    const file = new AttachmentBuilder(filePath);

    try {
      await message.author.send({
        content: '🔐 Here is your obfuscated Lua code:',
        files: [file]
      });
      await message.reply('📬 I sent you a DM with the obfuscated file.');
    } catch {
      await message.reply('❌ Could not send you a DM. Check your privacy settings.');
    }

    fs.unlink(filePath, () => {});
  }
});

// ===== LOGIN =====
client.login(token);
