const { Collection } = require('discord.js');

const { readdirSync } = require('fs');
const { join } = require('path');

const actionRoutes = readdirSync(join(__dirname, '..', 'routes')).filter((file) => file.endsWith('.js'));

client.actionSet = new Collection();
global.client = client;

for (const file of actionRoutes) {
    console.log(`# Loading action route: ${file}`);
    const action = require(join(__dirname, '..', 'routes', file));
    client.actionSet.set(action.name, action);
}