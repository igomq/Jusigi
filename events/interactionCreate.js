const {MessageFlags}=require('discord.js');
const {DomainError,check}=require('../domain/money');
async function handle(client,interaction) {
    try {
        if(interaction.isChatInputCommand()) {
            const command=client.routes.get(interaction.commandName);
            if(command)await command.command(client,interaction,interaction.user);
        } else if(interaction.isButton()||interaction.isModalSubmit()) {
            if(interaction.customId.startsWith('mg:'))return await require('../routes/MiniGameButton').handle(client,interaction);
            if(interaction.customId.startsWith('lg:')) {
                const games=require('../services/legacy-games');
                const parsed=games.parseCustomId(interaction.customId);
                check(parsed?.userId===interaction.user.id,'본인의 버튼만 사용할 수 있습니다.');
                return await games.handle(client,interaction);
            }
            let data;
            if(interaction.customId.startsWith('oe:')) {
                const [,userId,nonce,amount,choice]=interaction.customId.split(':');
                data={name:'OddEvenButton',userId,nonce,amount,choice};
            } else if(interaction.customId.startsWith('bk:')) {
                const [,userId,nonce,action]=interaction.customId.split(':');
                data={name:'BankruptButton',userId,nonce,action:action==='yes'};
            } else {try {data=JSON.parse(interaction.customId);}catch {return;}}
            check(data&&typeof data==='object'&&data.userId===interaction.user.id,'본인의 버튼만 사용할 수 있습니다.');
            const action=client.actionSet.get(data.name);
            check(action,'만료되었거나 알 수 없는 버튼입니다.');
            await action.command(client,interaction,data);
        }
    }catch(error) {
        const content=error instanceof DomainError?error.message:'처리 중 오류가 발생했습니다. 잔액을 확인한 뒤 다시 시도해주세요.';
        if(!(error instanceof DomainError))console.error('Interaction failed:',error.code||error.name);
        try {if(interaction.deferred||interaction.replied)await interaction.editReply({content,components:[]});else await interaction.reply({content,flags:MessageFlags.Ephemeral});}catch {}
    }
}
module.exports=client=>client.on('interactionCreate',interaction=>handle(client,interaction));
module.exports.handle=handle;
