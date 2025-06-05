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
  ActivityType
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ==== CONFIG ====
const token = '';
const clientId = '1379963473014030397';
const ownerId = '1366920828356399276';

// ==== INIT ====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  presence: {
    status: 'dnd',
    activities: [{ name: 'Loading...', type: ActivityType.Playing }]
  }
});
client.commands = new Collection();
client.blacklistedGuilds = new Set();

// ==== DEFINE /obfuscate COMMAND ====
const obfuscateCommand = new SlashCommandBuilder()
  .setName('obfuscate')
  .setDescription('Obfuscates code with real Lua junk.')
  .addStringOption(opt =>
    opt.setName('language')
      .setDescription('Language (currently only supports Lua)')
      .setRequired(true))
  .addStringOption(opt =>
    opt.setName('code')
      .setDescription('Code to obfuscate')
      .setRequired(true));

client.commands.set('obfuscate', {
  data: obfuscateCommand,
  async execute(interaction) {
    const language = interaction.options.getString('language').toLowerCase();
    const code = interaction.options.getString('code');

    if (language !== 'lua') {
      return interaction.reply({ content: '❌ Only Lua obfuscation is supported right now.', ephemeral: true });
    }

    function obfuscateLua(lua) {
      const varMap = new Map();
      const getRandomName = () => '_' + Math.random().toString(36).substring(2, 10);

      return '-- Obfuscated by Alchemist\n\n' + lua
        .split('\n')
        .map(line => {
          // Rename variables and functions
          line = line.replace(/\b(local\s+)?([a-zA-Z_]\w*)\b/g, (match, local, name) => {
            if (['if', 'then', 'else', 'end', 'function', 'return', 'local', 'for', 'while', 'do', 'break'].includes(name)) return match;
            if (!varMap.has(name)) varMap.set(name, getRandomName());
            return local ? `local ${varMap.get(name)}` : varMap.get(name);
          });

          // Encode strings
          line = line.replace(/"(.*?)"/g, (_, str) => `"\\x${Buffer.from(str).toString('hex')}"`);

          // Random junk block
          if (Math.random() < 0.2) {
            line = `if ${Math.floor(Math.random() * 500)} == ${Math.floor(Math.random() * 500)} then\n  ${line}\nend`;
          }

          return line;
        })
        .join('\n');
    }

    const obfuscated = obfuscateLua(code);
    const filePath = path.join(__dirname, 'Obfuscated.txt');
    fs.writeFileSync(filePath, obfuscated);

    const embed = new EmbedBuilder()
      .setTitle('🔐 Lua Obfuscation Complete')
      .setDescription(`Your Lua code has been obfuscated.`)
      .setColor('Green');

    const file = new AttachmentBuilder(filePath);

    try {
      await interaction.user.send({ embeds: [embed], files: [file] });
      await interaction.reply({ content: '📬 Obfuscated file sent to your DMs!', ephemeral: true });
    } catch {
      await interaction.reply({ content: '❌ Could not send DM. Check privacy settings.', ephemeral: true });
    }

    fs.unlinkSync(filePath);
  }
});

// ==== EVENT: BOT READY ====
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(token);

  const guilds = await client.guilds.fetch();
  console.log(`🔁 Registering slash command in ${guilds.size} guild(s)...`);

  for (const [guildId] of guilds) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: [obfuscateCommand.toJSON()] }
      );
      console.log(`✅ Registered command in guild ${guildId}`);
    } catch (err) {
      console.error(`❌ Failed in ${guildId}:`, err);
    }
  }

  // Update status to show live server count
  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: `/obfuscate | ${guilds.size} Servers`,
      type: ActivityType.Playing
    }]
  });
});

// ==== EVENT: SLASH COMMAND ====
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

// ==== EVENT: TEXT COMMANDS ====
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
