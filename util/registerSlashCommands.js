const { Collection } = require("discord.js");
const { readdirSync } = require('fs')
const { join } = require('path')

module.exports = async(client) => {
    const {default: gray} = await import('chalk');

    const {REST} = await require('@discordjs/rest');
    const {Routes} = await require('discord.js');
    await require('dotenv').config()

    const fs = await require('fs');

    const commands = [];
    const categoryDirs = readdirSync(join(__dirname, '../', 'commands'), { withFileTypes: true }).filter(category => category.isDirectory());
    const clientId = client.user.id;

    const executions = new Collection()
    for (const category of categoryDirs) {
        const scripts = readdirSync(join(__dirname, '../', 'commands', `${category.name}`))
        for (const file of scripts) {
            if (!file.endsWith('.js')) continue;
            const command = require(join(__dirname, '../', 'commands', `${category.name}`, `${file}`))
            console.log(gray(`-- Loading command ${command.data.name}`))

            commands.push(command.data.toJSON())
            executions.set(command.commandName, command.command)
        }
    }

    const rest = new REST( { version: '10' } ).setToken(process.env.TOKEN);
    try {
        console.log('Refreshing application (/) commands...');

        await rest.put(
            Routes.applicationCommands(clientId),
            {body: commands},
        );

        console.log('Successfully reloaded application (/) commands!');
    } catch (error) {
        console.error(error);
    }

    return executions
}