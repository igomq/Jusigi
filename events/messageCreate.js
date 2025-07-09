module.exports = (client) => {
    client.on("messageCreate", async (message) => {
        // Ignoring Bot Messages, DM Messages
        if (message.author.bot) return
        if (!message.guild) return

        // Get Commands By Message
        const args = message.content.slice(client.prefix.length).trim().split(/ +/)
        const commandName = args.shift().toLowerCase()
        const command =
            client.commands.get(commandName) ||
            client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName))

        if (!message.content.startsWith(',')) return;
        // Passing Message That Is Not A Command
        if (!command) return

        // Handling Errors from Command Execution
        let returnVal
        try {
            returnVal = await command.execute(message, client, args)
        } catch (error) {
            if (returnVal) await message.reply(returnVal)
            else {
                console.error(error)
                await message.reply({ content: "오류가 발생했습니다. 나중에 다시 시도해 주세요.", ephemeral: true })
            }
        }
    })
}