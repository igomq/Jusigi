const {SlashCommandBuilder}=require('discord.js');
const {execute}=require('../../util/command');
const data=new SlashCommandBuilder().setName('은행').setDescription('대출과 예금을 관리합니다.');
for(const name of ['대출','상환'])data.addSubcommand(s=>s.setName(name).setDescription(name+'을 처리합니다.').addIntegerOption(o=>o.setName('금액').setDescription('시기').setMinValue(1).setRequired(true)));
const type=o=>o.setName('종류').setDescription('예금 종류').setRequired(true).addChoices({name:'보통예금',value:'savings'},{name:'정기예금',value:'deposit'});
data.addSubcommand(s=>s.setName('예금').setDescription('보통예금 입금 또는 새 정기예금 플랜').addStringOption(type).addIntegerOption(o=>o.setName('금액').setDescription('시기').setMinValue(1).setRequired(true)).addIntegerOption(o=>o.setName('기간').setDescription('정기예금 일수').setMinValue(1)));
data.addSubcommand(s=>s.setName('인출').setDescription('보통예금 또는 만기 플랜 인출').addStringOption(type).addIntegerOption(o=>o.setName('금액').setDescription('보통예금 인출액, 생략하면 전액').setMinValue(1)).addStringOption(o=>o.setName('플랜').setDescription('정기예금 번호, 생략하면 만기 플랜 전체')));
data.addSubcommand(s=>s.setName('정보').setDescription('계좌 현황과 추가 대출 한도를 확인합니다.'));
module.exports={data,command:(c,i)=>{
    const sub=i.options.getSubcommand(),amount=i.options.getInteger('금액');
    if(sub==='대출'||sub==='상환')return execute(c,i,sub==='대출'?'loan':'repay',{amount});
    if(sub==='정보')return execute(c,i,'snapshot',{bankInfo:true});
    const savings=i.options.getString('종류')==='savings';
    return execute(c,i,savings?(sub==='예금'?'savingsDeposit':'savingsWithdraw'):(sub==='예금'?'termOpen':'termWithdraw'),{amount,period:i.options.getInteger('기간'),planId:i.options.getString('플랜')});
}};
