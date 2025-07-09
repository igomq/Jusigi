module.exports = (client) => {
    client.on('interactionCreate', async interaction => {
        if (interaction.isButton()) {
            const data = JSON.parse(interaction.customId);
            if (data.userId === interaction.user.id) {
                const button = client.buttonSet.get(data.name);
                if (!button) return;
                await button.command(client, interaction, data);
            }
        }
        if (!interaction.isCommand() || !interaction.isChatInputCommand()) return;

        const command = client.routes.get(interaction.commandName)
        if (!command) return

        command(client, interaction, interaction.user)
    });
}