const { Collection } = require('discord.js');

const { readdirSync } = require('fs');
const { join } = require('path');

const buttonRoutes = readdirSync(join(__dirname, '..', 'routes')).filter((file) => file.endsWith('.js'));

client.buttonSet = new Collection();
global.client = client;

for (const file of buttonRoutes) {
    console.log(`# Loading button: ${file}`);
    const button = require(join(__dirname, '..', 'routes', file));
    client.buttonSet.set(button.name, button);
}