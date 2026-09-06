const {Collection,REST,Routes}=require('discord.js');
const fs=require('node:fs/promises');
const path=require('node:path');
const config=require('../config');
async function loadCommands() {
    const commands=new Collection();
    const root=path.join(__dirname,'..','commands');
    for(const category of await fs.readdir(root,{withFileTypes:true})) {
        if(!category.isDirectory())continue;
        for(const file of await fs.readdir(path.join(root,category.name))) {
            if(!file.endsWith('.js'))continue;
            const command=require(path.join(root,category.name,file));
            if(!command.data||!command.command)throw new Error(`Invalid command ${file}`);
            if(commands.has(command.data.name))throw new Error(`Duplicate command ${command.data.name}`);
            command.data.toJSON();commands.set(command.data.name,command);
        }
    }
    return commands;
}
async function deploy() {
    if(!config.token||!config.applicationId)throw new Error('TOKEN and APPLICATION_ID required');
    const commands=await loadCommands();
    await new REST({version:'10'}).setToken(config.token).put(Routes.applicationCommands(config.applicationId),{body:[...commands.values()].map(c=>c.data.toJSON())});
    console.info(`Registered ${commands.size} commands`);
}
if(require.main===module)deploy().catch(error=>{console.error('Command registration failed:',error.code||error.name);process.exitCode=1;});
module.exports={loadCommands,deploy};
