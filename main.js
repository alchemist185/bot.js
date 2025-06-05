const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActivityType
} = require('discord.js');
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const TOKEN = 'YOUR_BOT_TOKEN'; // 🔁 Replace this
const CLIENT_ID = 'YOUR_CLIENT_ID'; // 🔁 Replace this
const OWNER_ID = 'YOUR_OWNER_ID'; // 🔁 Replace this
const PREFIX = '!a';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildInvites
  ],
  partials: [Partials.Channel]
});

let blacklist = { users: [], servers: [] };
if (fs.existsSync('blacklist.json')) {
  try {
    blacklist = JSON.parse(fs.readFileSync('blacklist.json'));
  } catch {
    blacklist = { users: [], servers: [] };
  }
}
function saveBlacklist() {
  fs.writeFileSync('blacklist.json', JSON.stringify(blacklist, null, 2));
}
function isBlacklisted(userId, guildId) {
  return blacklist.users.includes(userId) || blacklist.servers.includes(guildId);
}

async function realBypass(startUrl) {
  const startTime = Date.now();
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const selectors = [
      'button#skip', 'a#skip', '.skip-btn', '.btn-skip',
      'a.btn-primary', 'a.continue', 'button.continue'
    ];

    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        await page.waitForTimeout(3000);
        break;
      } catch {}
    }

    await page.waitForTimeout(10000);
    const finalUrl = page.url();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    await browser.close();
    return { success: true, result: finalUrl, time: elapsed };
  } catch (err) {
    if (browser) await browser.close();
    return { success: false, error: err.message };
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
    status: 'dnd',
    activities: [{ name: `${PREFIX} help`, type: ActivityType.Playing }]
  });
  setInterval(() => {
    client.user.setActivity(`${client.guilds.cache.size} servers`, { type: ActivityType.Watching });
  }, 15000);
});

const bypassCommands = ['fluxus', 'codex', 'delta', 'krnl', 'arceus'];

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, user, guild, options } = interaction;

  if (isBlacklisted(user.id, guild?.id)) {
    const msg = blacklist.users.includes(user.id) ? 'You are blacklisted.' : 'This server is blacklisted.';
    return interaction.reply({ content: msg, ephemeral: true });
  }

  if (commandName === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('Help')
      .setColor('Blue')
      .setDescription(
        bypassCommands.map(cmd => `• \`/${cmd} <url>\``).join('\n') + '\n• `/help`'
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (bypassCommands.includes(commandName)) {
    const url = options.getString('url');
    await interaction.deferReply();
    const result = await realBypass(url);
    if (result.success) {
      const embed = new EmbedBuilder()
        .setTitle(`${commandName.toUpperCase()} Bypassed`)
        .setColor('Green')
        .addFields(
          { name: 'Final Link', value: result.result },
          { name: 'Time Taken', value: `${result.time}s` }
        )
        .setFooter({ text: 'https://discord.gg/7UPrQXQhR9' });
      return interaction.editReply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setTitle(`${commandName.toUpperCase()} Failed`)
        .setColor('Red')
        .setDescription(`Error: ${result.error}`);
      return interaction.editReply({ embeds: [embed] });
    }
  }
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();
  const id = args[0];

  if (isBlacklisted(message.author.id, message.guild?.id)) {
    return message.reply(
      blacklist.users.includes(message.author.id)
        ? 'You are blacklisted.'
        : 'This server is blacklisted.'
    );
  }

  if (cmd === 'blacklist') {
    if (message.author.id !== OWNER_ID) return;
    if (!id) return message.reply('Provide a user or server ID.');
    if (!blacklist.users.includes(id) && !blacklist.servers.includes(id)) {
      blacklist.users.push(id);
      saveBlacklist();
      return message.channel.send(`Blacklisted: ${id}`);
    } else return message.reply('Already blacklisted.');
  }

  if (cmd === 'unblacklist') {
    if (message.author.id !== OWNER_ID) return;
    if (!id) return message.reply('Provide an ID.');
    blacklist.users = blacklist.users.filter(x => x !== id);
    blacklist.servers = blacklist.servers.filter(x => x !== id);
    saveBlacklist();
    return message.channel.send(`Unblacklisted: ${id}`);
  }

  if (cmd === 'invites') {
    if (message.author.id !== OWNER_ID) return;
    try {
      const invites = await message.guild.invites.fetch();
      const list = invites.map(inv => `• ${inv.code} (${inv.uses ?? 0} uses)`).join('\n') || 'None.';
      await message.author.send(`Invites for ${message.guild.name}:\n${list}`);
      return message.reply('Check your DMs.');
    } catch {
      return message.reply('Could not fetch invites.');
    }
  }
});

client.login(TOKEN);
