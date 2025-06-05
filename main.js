const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, Collection, AttachmentBuilder, EmbedBuilder, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// ==== CONFIG ====
const token = 'YOUR_BOT_TOKEN';
const clientId = 'YOUR_CLIENT_ID';
const ownerId = 'YOUR_OWNER_ID';

// ==== INIT ====
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.commands = new Collection();
client.blacklistedGuilds = new Set();

// ==== OBFSUCATE COMMAND ====
const obfuscateCommand = new SlashCommandBuilder()
  .setName('obfuscate')
  .setDescription('Obfuscates code with fake junk.')
  .addStringOption(opt =>
    opt.setName('language')
      .setDescription('Language (js, py, lua)')
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

    let obfuscated = '';

    if (language === 'lua') {
      const junk = `-- ${Math.random().toString(36).substring(2, 10)}\n`.repeat(20);
      const replaced = code.replace(/([a-zA-Z_]\w*)/g, v => `var_${Math.random().toString(36).substring(2, 6)}`);
      obfuscated = `-- Obfuscated by Alchemist\n${junk}\n${replaced}`;
    } else {
      const junk = `// ${Math.random().toString(36).substring(2, 10)}\n`.repeat(20);
      obfuscated = `// Obfuscated by Alchemist\n// Language: ${language}\n\n${junk}${code}`;
    }

    const filePath = path.join(__dirname, 'Obfuscated.txt');
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
      await interaction.reply({ content: '❌ Could not send DM. Please check your privacy settings.', ephemeral: true });
    }

    fs.unlinkSync(filePath);
  }
});

// ==== REGISTER PER-GUILD COMMANDS ON STARTUP ====
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(token);

  for (const guild of client.guilds.cache.values()) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guild.id),
        { body: [obfuscateCommand.toJSON()] }
      );
      console.log(`✅ Registered command for guild ${guild.name} (${guild.id})`);
    } catch (err) {
      console.error(`❌ Failed to register in ${guild.id}:`, err);
    }
  }

  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: `/obfuscate | Servers: ${client.guilds.cache.size}`,
      type: ActivityType.Playing
    }]
  });
});

// ==== SLASH COMMAND HANDLER ====
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

// ==== BLACKLIST MESSAGE COMMAND ====
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
