(async() => {
    // Import Modules
    const { Client, Collection, ActivityType, GatewayIntentBits } = await require('discord.js')
    const { readdirSync } = await require('fs')
    const { join } = await require('path')
    const logger = await require('./log')
    await require('dotenv').config()
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ],
        disableMentions: "everyone",
        restTimeOffset: 0
    })

    global.client = client;
    global.activities = new Collection();
    global.gameInfo = {};

    // Initialize
    require('./manager/RouteManager')
    const price_manager = require('./manager/PriceManager')
    await price_manager();

    await client.login(process.env.TOKEN)
    client.prefix = process.env.PREFIX
    client.commands = new Collection()

    // Registering Commands
    const categories = readdirSync(join(__dirname, 'commands'), {withFileTypes: true}).filter((folder) => folder.isDirectory())
    for (const category of categories) {
        const commands = readdirSync(join(__dirname, 'commands', `${category.name}`)).filter((file) => file.endsWith('.js'))
        for (const file of commands) {
            const command = require(join(__dirname, 'commands', `${category.name}`, `${file}`))

            if (command.name) { client.commands.set(command.name,command)
                console.log(`Registering Commands: ${command.name}`) }
        }
    }

    // Registering Slash Commands
    client.routes = await require('./util/registerSlashCommands')(client)

    // Registering Events
    require('./events/ready')(client)
    require('./events/messageCreate')(client)
    require('./events/interactionCreate')(client)
})()

global.replyEphemeral = async (interaction, option) => {
    const replyOption = option;
    replyOption.flags = replyOption.flags || 64; // MessageFlags.Ephemeral

    await interaction.reply(replyOption);
}
global.reply = async (interaction, option) => await interaction.reply(option);
global.commaByThree = (number) => number.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")

const moment = require('moment');
global.calculateCompoundInterest = (principal, interestRate, loanDate) => {
    if (!principal || !interestRate || !loanDate) return principal;
    
    const startDate = moment(loanDate);
    const currentDate = moment();
    const daysDiff = currentDate.diff(startDate, 'days');
    
    if (daysDiff <= 0) return principal;
    
    // 복리 계산: P * (1 + r/100)^n
    const dailyRate = interestRate / 100;
    return Math.floor(principal * Math.pow(1 + dailyRate, daysDiff));
}