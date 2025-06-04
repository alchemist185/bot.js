const { Client, GatewayIntentBits, Partials, REST, Routes, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const TOKEN = 'YOUR_BOT_TOKEN';
const CLIENT_ID = 'YOUR_CLIENT_ID';
const OWNER_ID = 'YOUR_USER_ID';
const WEBHOOK_URL = 'YOUR_WEBHOOK_URL';

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
],
partials: [Partials.Channel]
});

const PREFIX = 'a!';
const blacklist = {
users: new Set(),
servers: new Set()
};

const webhookClient = new (require("discord.js")).WebhookClient({ url: WEBHOOK_URL });

client.once('ready', async () => {
console.log(Bot ready as ${client.user.tag});
client.user.setPresence({
status: 'dnd',
activities: [{ name: 'a!help', type: 0 }]
});

// Register slash commands  
const commands = [  
    {  
        name: 'help',  
        description: 'Show all commands'  
    }  
];  

const rest = new REST({ version: '10' }).setToken(TOKEN);  
await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

});

client.on('interactionCreate', async interaction => {
if (!interaction.isCommand()) return;

const { commandName } = interaction;  

if (commandName === 'help') {  
    const helpEmbed = new EmbedBuilder()  
        .setTitle("📜 Help Menu")  
        .setColor("Blue")  
        .setDescription(`**Prefix Commands:**\n

`a!kick [@user|ID] [reason?]`
`a!ban [@user|ID] [reason?]`
`a!mute [@user|ID] [reason?]`
`a!role [@user] [@role]`
`a!removerole [@user] [@role]`
`a!blacklist user/server [id]`
`a!unblacklist user/server [id]``);

return interaction.reply({ embeds: [helpEmbed], ephemeral: true });  
}

});

client.on("messageCreate", async msg => {
if (msg.author.bot || !msg.guild || !msg.content.toLowerCase().startsWith(PREFIX.toLowerCase())) return;

if (blacklist.servers.has(msg.guild.id) || blacklist.users.has(msg.author.id)) return;  

const args = msg.content.slice(PREFIX.length).trim().split(/ +/);  
const command = args.shift().toLowerCase();  

const log = async (action, target, reason) => {  
    await webhookClient.send({  
        embeds: [new EmbedBuilder()  
            .setTitle(`${action} Log`)  
            .setDescription(`**Executor:** ${msg.author.tag}\n**Target:** ${target}\n**Reason:** ${reason || 'No reason provided'}`)  
            .setColor('Red')  
            .setTimestamp()]  
    });  
};  

if (['kick'].includes(command)) {  
    const member = msg.mentions.members.first() || await msg.guild.members.fetch(args[0]).catch(() => null);  
    const reason = args.slice(1).join(' ') || 'No reason provided';  
    if (!member) return msg.reply("User not found.");  
    await member.kick(reason).catch(() => msg.reply("Failed to kick."));  
    await msg.reply(`✅ Kicked ${member.user.tag}`);  
    await log("Kick", member.user.tag, reason);  
}  

if (['ban'].includes(command)) {  
    const member = msg.mentions.members.first() || await msg.guild.members.fetch(args[0]).catch(() => null);  
    const reason = args.slice(1).join(' ') || 'No reason provided';  
    if (!member) return msg.reply("User not found.");  
    await member.ban({ reason }).catch(() => msg.reply("Failed to ban."));  
    await msg.reply(`✅ Banned ${member.user.tag}`);  
    await log("Ban", member.user.tag, reason);  
}  

if (['mute'].includes(command)) {  
    const member = msg.mentions.members.first() || await msg.guild.members.fetch(args[0]).catch(() => null);  
    const reason = args.slice(1).join(' ') || 'No reason provided';  
    if (!member) return msg.reply("User not found.");  
    await member.timeout(60_000, reason).catch(() => msg.reply("Failed to timeout."));  
    await msg.reply(`✅ Muted ${member.user.tag} for 1 min`);  
    await log("Mute", member.user.tag, reason);  
}  

if (['role'].includes(command)) {  
    const member = msg.mentions.members.first();  
    const role = msg.mentions.roles.first();  
    if (!member || !role) return msg.reply("Mention both user and role.");  
    await member.roles.add(role).catch(() => msg.reply("Failed to give role."));  
    await msg.reply(`✅ Gave ${role.name} to ${member.user.tag}`);  
    await log("Role Grant", member.user.tag, role.name);  
}  

if (['removerole'].includes(command)) {  
    const member = msg.mentions.members.first();  
    const role = msg.mentions.roles.first();  
    if (!member || !role) return msg.reply("Mention both user and role.");  
    await member.roles.remove(role).catch(() => msg.reply("Failed to remove role."));  
    await msg.reply(`✅ Removed ${role.name} from ${member.user.tag}`);  
    await log("Role Removal", member.user.tag, role.name);  
}  

if (['help'].includes(command)) {  
    return msg.reply("Use `/help` or `a!help` to see all commands.");  
}  

if (['blacklist'].includes(command)) {  
    if (msg.author.id !== OWNER_ID) return msg.reply("Only the owner can use this.");  
    const type = args[0];  
    const id = args[1];  
    if (!type || !id) return msg.reply("Usage: `!blacklist user/server id`");  
    if (type === "user") blacklist.users.add(id);  
    if (type === "server") blacklist.servers.add(id);  
    return msg.reply(`✅ Blacklisted ${type} ${id}`);  
}  

if (['unblacklist'].includes(command)) {  
    if (msg.author.id !== OWNER_ID) return msg.reply("Only the owner can use this.");  
    const type = args[0];  
    const id = args[1];  
    if (!type || !id) return msg.reply("Usage: `!unblacklist user/server id`");  
    if (type === "user") blacklist.users.delete(id);  
    if (type === "server") blacklist.servers.delete(id);  
    return msg.reply(`✅ Unblacklisted ${type} ${id}`);  
}

});

client.login(TOKEN);
