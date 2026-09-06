const {SlashCommandBuilder}=require('discord.js');
const {execute}=require('../../util/command');
const data=new SlashCommandBuilder().setName('아이템').setDescription('보유 아이템을 관리합니다.').addSubcommand(s=>s.setName('목록').setDescription('보유번호와 등급 확인'));
for(const name of ['강화','사용'])data.addSubcommand(s=>s.setName(name).setDescription('아이템 '+name).addStringOption(o=>o.setName('아이템명').setDescription('아이템명 또는 종류 ID')).addStringOption(o=>o.setName('보유번호').setDescription('같은 이름이 여럿이면 보유번호 지정')));
module.exports={data,command:(c,i)=>execute(c,i,{목록:'inventory',강화:'upgradeItem',사용:'useItem'}[i.options.getSubcommand()],{item:i.options.getString('아이템명'),inventoryId:i.options.getString('보유번호')})};
