module.exports = (client) => {
    client.on('interactionCreate', async interaction => {
        if (interaction.isButton() || interaction.isModalSubmit()) {
            const data = JSON.parse(interaction.customId);
            if (data.userId === interaction.user.id) {
                const action = client.actionSet.get(data.name);
                if (!action) return;
                await action.command(client, interaction, data);
            }
            return;
        }
        if (!interaction.isCommand() || !interaction.isChatInputCommand()) return;

        const command = client.routes.get(interaction.commandName)
        if (!command) return

        command(client, interaction, interaction.user)
    });
}