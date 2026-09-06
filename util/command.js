const { MessageFlags }=require('discord.js');
const { json,DomainError }=require('../domain/money');
const money=n=>BigInt(n).toLocaleString('ko-KR');
function format(result) {
    if(result.message)return result.message+`\n잔액 ${money(result.balance)}시기 · 신용 ${result.credit}등급`;
    const labels={balance:'잔액',credit:'신용등급',borrowed:'대출금',repaid:'상환금',principal:'예금 원금',tax:'세금',withdrawn:'인출액',donated:'기부액',totalDonations:'누적 기부',availableLoan:'추가대출 한도',netAssets:'순자산',debt:'현재 부채',quantity:'수량',price:'주가',cost:'원가/비용',fee:'수수료',itemEffect:'아이템 효과',realized:'실현손익',gross:'도박 세전손익',net:'도박 순손익',purchased:'구매',grade:'아이템 등급',oldGrade:'이전 등급',inventoryId:'보유번호',used:'사용',remaining:'남은 횟수',planId:'예금 플랜',period:'기간(일)',startedAt:'시작 시각',dueAt:'상환기한',rate:'일 이율',changed:'입출금액',symbol:'종목',side:'거래 종류'};
    const lines=[];
    for(const [key,value] of Object.entries(result)) {
        if(value===null) {if(key==='dueAt')lines.push('상환기한: 미설정');continue;}
        if(key==='rate') {lines.push(`일 이율: ${Number(value)/1000000}%`);continue;}
        if(key==='activated') {lines.push(`효과: ${value?'성공':'실패 (사용 횟수 소비)'}`);continue;}
        if(key==='bankRates') {lines.push(`대출 일 이율 ${value.loan/1000000}% · 보통예금 일 이율 ${value.savings/1000000}% · 정기예금 일 이율 (${value.term/1000000} × 기간²)% / 상한 ${value.cap/1000000}%`);continue;}
        if(key==='benefits') {lines.push(`예금 이익세 ${value.tax/1000000}% · 주식 수수료 감면 ${100-value.fee/1000000}% · 아이템 효과 ${value.item/1000000}%${value.gamble?` · 도박 한도 ${money(value.gamble)}시기`:''}${value.item===0?' · 아이템 강화 불가':''} · 게임 성공 드롭 보너스 ${value.dropBonus}%p`);continue;}
        if(key==='outcome') {lines.push(`결과: ${(value.numbers||[]).join(' · ')}`);continue;}
        if(key==='holdings') {for(const h of value)lines.push(`${h.symbol}: ${money(h.quantity)}주 · 평균원가 ${(Number(h.total_cost)/Number(h.quantity)).toFixed(2)} · 현재가 ${money(h.price)}`);continue;}
        if(key==='loans') {for(const l of value)lines.push(`대출 #${l.id}: ${money(l.current)}시기 · 일 ${l.rate/1000000}% · 기한 ${l.due_at||'미설정'}`);continue;}
        if(key==='savings') {lines.push(`보통예금: ${money(value.total)}시기 (세금 ${money(value.tax)})`);continue;}
        if(key==='plans') {for(const p of value)lines.push(typeof p==='object'?`정기예금 #${p.id}: ${money(p.principal)}시기 · 만기 ${new Date(p.matures_at).toISOString()}`:`인출 플랜 #${p}`);continue;}
        if(key==='items') {for(const i of value)lines.push(`${i.id}: ${i.name} · ${i.price?money(i.price)+'시기':require('../domain/rules').GRADES[i.grade]}${i.uses_left?' · 남은 횟수 '+i.uses_left:''}`);if(!value.length)lines.push('아이템이 없습니다.');continue;}
        if(key==='quickPassPrice') {lines.push(`quick_pass: Casino Quick Pass · ${money(value)}시기 (영구)`);continue;}
        if(labels[key])lines.push(`${labels[key]}: ${/^-?\d+$/.test(String(value))?money(value):value}`);
    }
    return lines.join('\n')||'완료되었습니다.';
}
async function respond(interaction,result) {
    if(result?.kind?.startsWith('legacy_')||result?.kind?.startsWith('minigame_'))return respondGame(interaction,result);
    const content=typeof result==='string'?result:format(result);
    const payload=content.length<=1900?{content}:{content:'상세 내역을 첨부했습니다.',files:[{attachment:Buffer.from(content),name:'jusigi.txt'}]};
    payload.allowedMentions={parse:[]};
    if(interaction.deferred||interaction.replied)return interaction.editReply(payload);
    return interaction.reply({...payload,flags:MessageFlags.Ephemeral});
}
async function respondGame(interaction,result) {
    const {ActionRowBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,MessageFlags}=require('discord.js');
    const view=result.view||{},buttons=view.buttons||result.buttons||[];
    const components=[];
    for(let i=0;i<buttons.length;i+=5)components.push(new ActionRowBuilder().addComponents(...buttons.slice(i,i+5).map(b=>new ButtonBuilder().setCustomId(b.customId).setLabel(b.label).setStyle({primary:ButtonStyle.Primary,danger:ButtonStyle.Danger,success:ButtonStyle.Success}[b.style]||ButtonStyle.Primary))));
    let content=result.message||'게임을 처리했습니다.';
    if(result.attempts!=null)content+=`\n남은 기회: ${result.attempts}`;
    if(result.dropChance!=null)content+=`\n성공 시 패시브 획득 확률: ${Math.round(result.dropChance*100)}%`;
    if(result.itemDrop)content+=`\n아이템 획득: ${result.itemDrop.name} (${result.itemDrop.grade}) · 보유번호 ${result.itemDrop.inventoryId}`;
    if(result.net!=null)content+=`\n순손익: ${money(result.net)}시기 · 세금 ${money(result.tax)}시기`;
    if(result.balance!=null)content+=`\n잔액: ${money(result.balance)}시기`;
    const payload={content,components,allowedMentions:{parse:[]}};
    if(view.title)payload.embeds=[new EmbedBuilder().setTitle(view.title.slice(0,256)).setDescription([view.description,...(view.choices||[]).map((v,i)=>`${i+1}. ${v}`)].join('\n').slice(0,4096))];
    if(interaction.deferred||interaction.replied)return interaction.editReply(payload);
    return interaction.reply({...payload,flags:MessageFlags.Ephemeral});
}
async function execute(client,interaction,operation,args={}) {
    if(!interaction.deferred&&!interaction.replied)await interaction.deferReply({flags:MessageFlags.Ephemeral});
    const result=await client.economy.execute(interaction.user.id,interaction.id,operation,args);
    await respond(interaction,result);return result;
}
module.exports={respond,execute,format,money};
