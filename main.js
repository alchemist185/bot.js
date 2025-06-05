const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  Collection,
  AttachmentBuilder,
  EmbedBuilder,
  ActivityType,
  PresenceUpdateStatus
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ==== CONFIG ====
const token = ''; // heil hilter
const clientId = '1379963473014030397';
const ownerId = '1366920828356399276';

// ==== INIT ====
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
client.commands = new Collection();
client.blacklistedGuilds = new Set();

// ==== LUA OBFUSCATOR ====
function obfuscateLua(code) {
  let varIndex = 0;
  const varMap = {};
  const encodedStrings = {};
  const identifier = /([a-zA-Z_][a-zA-Z0-9_]*)/g;

  // Variable renaming
  code = code.replace(identifier, (match) => {
    if (['if', 'then', 'end', 'function', 'local', 'for', 'while', 'do', 'return'].includes(match)) return match;
    if (!varMap[match]) varMap[match] = '_x' + (++varIndex).toString(36);
    return varMap[match];
  });

  // String encoding
  code = code.replace(/"(.*?)"/g, (_, str) => {
    let encoded = str.split('').map(c => `\\${c.charCodeAt(0)}`).join('');
    return `"${encoded}"`;
  });

  // Wrap in fake junk
  const junk = `--[[ Obfuscated by Alchemist ]]\nlocal __junk = "${Math.random().toString(36).repeat(10)}"\n`;
  return junk + code;
}

// ==== DEFINE /obfuscate COMMAND ====
const obfuscateCommand = new SlashCommandBuilder()
  .setName('obfuscate')
  .setDescription('Obfuscates code with real logic.')
  .addStringOption(opt =>
    opt.setName('language')
      .setDescription('Language (lua only for now)')
      .setRequired(true))
  .addStringOption(opt =>
    opt.setName('code')
      .setDescription('Code to obfuscate')
      .setRequired(true));

client.commands.set('obfuscate', {
  data: obfuscateCommand,
  async execute(interaction) {
    const language = interaction.options.getString('language');
    const code = interaction.options.getString('code');

    if (language !== 'lua') {
      return interaction.reply({ content: '❌ Only `lua` is supported for now.', ephemeral: true });
    }

    const obfuscated = obfuscateLua(code);
    const filePath = path.join(__dirname, 'Obfuscated.lua');
    fs.writeFileSync(filePath, obfuscated);

    const embed = new EmbedBuilder()
      .setTitle('🔐 Obfuscation Complete')
      .setDescription(`Language: \`${language}\`\nYour file is in your DMs.`)
      .setColor('Green');

    const file = new AttachmentBuilder(filePath);

    try {
      await interaction.user.send({ embeds: [embed], files: [file] });
      await interaction.reply({ content: '📬 Sent obfuscated file to your DMs!', ephemeral: true });
    } catch {
      await interaction.reply({ content: '❌ Could not send DM. Check privacy settings.', ephemeral: true });
    }

    fs.unlinkSync(filePath);
  }
});

// ==== GUILD-SPECIFIC SLASH REGISTRATION ====
client.on(Events.GuildCreate, async (guild) => {
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guild.id), {
      body: [obfuscateCommand.toJSON()]
    });
    console.log(`✅ Slash command registered for ${guild.name} (${guild.id})`);
  } catch (err) {
    console.error(`❌ Failed to register command for guild ${guild.id}:`, err);
  }
});

// ==== EVENT: BOT READY ====
client.once(Events.ClientReady, async () => {
  const guildCount = client.guilds.cache.size;

  // Register for all joined guilds
  const rest = new REST({ version: '10' }).setToken(token);
  for (const [guildId] of client.guilds.cache) {
    try {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: [obfuscateCommand.toJSON()]
      });
      console.log(`✅ Slash command registered for guild ${guildId}`);
    } catch (err) {
      console.error(`❌ Failed to register command for ${guildId}:`, err);
    }
  }

  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: `/obfuscate | ${guildCount} Servers`,
      type: ActivityType.Playing
    }]
  });

  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ==== INTERACTION HANDLER ====
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (client.blacklistedGuilds.has(interaction.guildId)) {
    return interaction.reply({ content: '❌ This server is blacklisted.', ephemeral: true });
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: '❌ Command error.', ephemeral: true });
  }
});

// ==== MESSAGE BLACKLIST CONTROLS ====
client.on(Events.MessageCreate, message => {
  if (!message.content.startsWith('!a')) return;
  if (message.author.id !== ownerId) return;

  const [cmd, arg] = message.content.slice(3).trim().split(/ +/);

  if (cmd === 'blacklist') {
    if (!arg) return message.reply('⚠️ Provide a guild ID.');
    client.blacklistedGuilds.add(arg);
    message.reply(`🔒 Guild \`${arg}\` blacklisted.`);
  }

  if (cmd === 'unblacklist') {
    if (!arg) return message.reply('⚠️ Provide a guild ID.');
    client.blacklistedGuilds.delete(arg);
    message.reply(`🔓 Guild \`${arg}\` unblacklisted.`);
  }
});

// ==== LOGIN ====
client.login(token);
