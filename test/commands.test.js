const test=require('node:test');const assert=require('node:assert/strict');
const {loadCommands}=require('../util/registerSlashCommands');
const {handle}=require('../events/interactionCreate');
const {createImage}=require('../util/createChart');
const {respond}=require('../util/command');
function interaction(name,values={}) {
    const replies=[];
    return {id:'123456789012345678',user:{id:'123456789012345678'},commandName:name,replies,
        options:{getSubcommand:()=>values.sub,getInteger:n=>values[n]??null,getString:n=>values[n]??null},
        isChatInputCommand:()=>true,isButton:()=>false,isModalSubmit:()=>false,
        async deferReply(){this.deferred=true;},async reply(v){this.replied=true;replies.push(v);},async editReply(v){replies.push(v);}
    };
}
test('all command schemas load without login/API and retain existing names',async()=>{
    const commands=await loadCommands();assert.equal(commands.size,18);
    for(const command of commands.values())assert(command.data.toJSON().name);
    for(const name of ['다섯고개','넌센스','홀짝','중지','은행','신용등급','차트','주가표','거래','탈퇴'])assert(commands.has(name));
});
test('thin command paths send actor and original interaction ID to service',async()=>{
    const routes=await loadCommands(),calls=[];
    const client={routes,economy:{execute:async(...args)=>{calls.push(args);return {balance:'100000',credit:2};}}};
    for(const [name,values,operation] of [['가입',{},'signup'],['은행',{sub:'예금',종류:'deposit',금액:1000,기간:3},'termOpen'],['은행',{sub:'인출',종류:'savings',금액:5},'savingsWithdraw'],['거래',{sub:'매수',종목:'곰큐항공',수량:'올인'},'trade'],['슬롯머신',{금액:1},'gamble']]) {
        const i=interaction(name,values);await handle(client,i);assert.equal(calls.at(-1)[0],i.user.id);assert.equal(calls.at(-1)[1],i.id);assert.equal(calls.at(-1)[2],operation);assert.equal(i.replies.length,1);
    }
});
test('button payloads fit Discord limit and another actor cannot execute them',async()=>{
    const routes=await loadCommands();
    for(const name of ['홀짝','파산신청']) {
        const i=interaction(name,{금액:9007199254740991});await routes.get(name).command({},i);
        for(const button of i.replies[0].components[0].components)assert(button.data.custom_id.length<=100);
        const payload=i.replies[0].components[0].components[0].data.custom_id;
        const bad=interaction('');bad.isChatInputCommand=()=>false;bad.isButton=()=>true;bad.customId=payload;bad.user.id='999';
        await handle({actionSet:new Map()},bad);assert.match(bad.replies[0].content,/본인/);
    }
});
test('legacy UI renders choices and split rows, no raw state/answer exposed',async()=>{
    const i=interaction('');await respond(i,{kind:'legacy_started',balance:'900000',message:'시작',view:{title:'질문',description:'선택',choices:['a','b','c','d','e'],buttons:Array.from({length:7},(_,n)=>({customId:`lg:s:123:a${n}`,label:String(n),style:'primary'}))}});
    assert.equal(i.replies[0].components.length,2);assert.equal(i.replies[0].embeds.length,1);
});
test('chart exports PNG with actual timestamp axis without Discord login',async()=>{
    const png=await createImage(['곰큐항공'],[{label:'곰큐항공',color:'#123456',data:[{x:1700000000000,y:100},{x:1700000300000,y:102}]}]);
    assert.equal(png.subarray(1,4).toString(),'PNG');
});
