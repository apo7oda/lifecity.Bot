const DiscordSmith = require('discord.js');
const smithmta = require('gamedig');
const smithconfig = require('./config.json');

const smithbot = new DiscordSmith.Client({ intents: [DiscordSmith.Intents.FLAGS.GUILDS] });
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const commands = [
	new SlashCommandBuilder().setName('server').setDescription('mta server status'),
    new SlashCommandBuilder().setName('player').setDescription('player in game'),
]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(smithconfig.token);

let statusMessage = null;

smithbot.once('ready', () => {
	console.log(`Logged : ${smithbot.user.tag}`);
    
    setInterval(() => {
        smithmta.query({
            type: 'mtasa',
            host: smithconfig.server_ip,
            port: smithconfig.server_port
        }).then((state) => {
            smithbot.user.setActivity(`Player : ${state.raw.numplayers}/${state.maxplayers}`);
        }).catch(err => {
            console.log(err);
        });
    }, 5000);
    
    (async () => {
        try {
            await rest.put(
                Routes.applicationGuildCommands(smithbot.user.id, smithconfig.guildId),
                { body: commands },
            );
    
            console.log('Successfully registered application commands.');
        } catch (error) {
            console.error(error);
        }
    })();

    async function createServerEmbed() {
        try {
            const state = await smithmta.query({
                type: 'mtasa',
                host: smithconfig.server_ip,
                port: smithconfig.server_port
            });

            return new DiscordSmith.MessageEmbed()
                .setTitle(state.name)
                .setColor(`BLUE`)
                .addField(`Map :`, ` - ${state.map}`, true)
                .addField(`Gametype :`, ` - ${state.raw.gametype}`, true)
                .addField(`Developer :`, ` - ${state.raw.Developer}`, true)
                .addField(`Player :`, ` - ${state.raw.numplayers}/${state.maxplayers}`, true)
                .addField(`Ping:`, ` - ${state.ping}ms`, true)
                .addField(`IP:`, ` - ${state.connect}`, true)
                .setTimestamp()
                .setFooter(`آخر تحديث`);
        } catch (err) {
            console.log('Error creating embed:', err);
            return null;
        }
    }

    setInterval(async () => {
        try {
            const channel = await smithbot.channels.fetch('1435996216910418041');
            
            if (!channel) {
                console.log('Channel not found!');
                return;
            }

            const embed = await createServerEmbed();
            
            if (!embed) {
                console.log('Failed to create embed');
                return;
            }

            if (!statusMessage) {
                statusMessage = await channel.send({ embeds: [embed] });
                console.log('Initial message sent!');
            } else {
                await statusMessage.edit({ embeds: [embed] });
                console.log('Message updated!');
            }
        } catch (err) {
            console.log('Error updating status:', err);

            statusMessage = null;
        }
    }, 60000); 
});


smithbot.on('interactionCreate', async smithmsg => {
	if (!smithmsg.isCommand()) return;

	const { commandName } = smithmsg;

	if (commandName === 'server') {
		smithmta.query({
            type: 'mtasa',
            host: smithconfig.server_ip,
            port: smithconfig.server_port
        }).then(async (state) => {
            console.log(state)
            var smithembed = new DiscordSmith.MessageEmbed()
            .setTitle(state.name)
            .setColor(`BLUE`)
            .addField(`Map :`,` - ${state.map}`,true)
            .addField(`Gametype :`,` - ${state.raw.gametype}`,true)
            .addField(`Developer :`,` - ${state.raw.Developer}`,true)
            .addField(`Player :`,` - ${state.raw.numplayers}/${state.maxplayers}`,true)
            .addField(`Ping:`,` - ${state.ping}ms`,true)
            .addField(`IP:`,` - ${state.connect}`,true)
            .setTimestamp()
            .setFooter(`Requested by ${smithmsg.member.user.tag}`,smithmsg.member.user.avatarURL());

            await smithmsg.reply({ embeds: [smithembed] });
        }).catch(err => {
            console.log(err);
        });
	} 
});

smithbot.login(smithconfig.token);