const {randomUUID}=require('node:crypto');
const repo=require('../repositories/economy');
const {check,json}=require('../domain/money');
const {GAMES,puzzle}=require('../domain/minigames');
const {dropChance}=require('../domain/rules');
function view(userId,sessionId,question,phase) {
    return {title:'미니게임',description:question,buttons:[{customId:`mg:${userId}:${sessionId}:${phase==='show'?'hide':'answer'}`,label:phase==='show'?'외웠어요 · 숫자 숨기기':'정답 입력',style:'primary'}]};
}
async function session(ctx,id) {
    const row=await repo.one(ctx.db,'SELECT * FROM minigame_sessions WHERE user_id=? AND session_id=? FOR UPDATE',[ctx.user.id,id]);
    check(row&&row.status==='active','이미 종료되었거나 만료된 게임입니다.');
    return row;
}
async function minigameStart(ctx,args) {
    const {db,user,now,random}=ctx,type=args.game;
    check(Object.hasOwn(GAMES,type),'지원하지 않는 미니게임입니다.');
    const old=await repo.one(db,'SELECT available_at FROM minigame_sessions WHERE user_id=? AND type=?',[user.id,type]);
    check(!old||+now>=+new Date(old.available_at),'이 미니게임은 시작 후 5분마다 참여할 수 있습니다.');
    const game=GAMES[type],state={...puzzle(type,random),reward:game.reward.toString()},id=randomUUID();
    await repo.rows(db,'INSERT INTO minigame_sessions(user_id,type,session_id,status,state,started_at,expires_at,available_at) VALUES (?,?,?,\'active\',?,?,?,?) ON DUPLICATE KEY UPDATE session_id=VALUES(session_id),status=VALUES(status),state=VALUES(state),started_at=VALUES(started_at),expires_at=VALUES(expires_at),available_at=VALUES(available_at),finished_at=NULL',[user.id,type,id,json(state),now,new Date(+now+game.duration),new Date(+now+game.cooldown)]);
    return {kind:'minigame_started',session:id,message:`${game.name} · 베팅 없음 · 정답 보상 ${game.reward}시기 · 제한 ${game.duration/1000}초`,dropChance:dropChance(type,user.credit),view:view(user.id,id,state.question,state.phase)};
}
async function minigameHide(ctx,args) {
    const row=await session(ctx,args.session),state=typeof row.state==='string'?JSON.parse(row.state):row.state;
    check(row.type==='memory'&&state.phase==='show','이미 숫자를 숨겼습니다.');
    check(+ctx.now<+new Date(row.expires_at),'제한 시간이 지났습니다.');
    state.phase='answer';
    await repo.rows(ctx.db,'UPDATE minigame_sessions SET state=? WHERE session_id=?',[json(state),row.session_id]);
    return {kind:'minigame_hidden',message:'기억한 다섯 자리를 입력하세요.',view:view(ctx.user.id,row.session_id,'숫자가 숨겨졌습니다.','answer')};
}
async function minigameAnswer(ctx,args) {
    const row=await session(ctx,args.session),state=typeof row.state==='string'?JSON.parse(row.state):row.state;
    check(state.phase==='answer','먼저 숫자 숨기기 버튼을 눌러주세요.');
    const answer=String(args.answer??'').trim();
    check(row.type==='memory'?/^\d{5}$/.test(answer):/^-?\d{1,4}$/.test(answer),'정답 형식을 확인해주세요.');
    const matches=row.type==='memory'?answer===state.answer:Number(answer)===Number(state.answer);
    const expired=+ctx.now>=+new Date(row.expires_at),correct=!expired&&matches;
    const reward=correct?BigInt(state.reward):0n;
    ctx.user.balance+=reward;
    const itemDrop=correct?await ctx.awardDrop(row.type):null;
    await repo.rows(ctx.db,"UPDATE minigame_sessions SET status='complete',finished_at=? WHERE session_id=?",[ctx.now,row.session_id]);
    return {kind:'minigame_finished',correct,reward,itemDrop,message:expired?'제한 시간이 지났습니다. 보상은 없습니다.':correct?`정답입니다! ${reward}시기를 받았습니다.`:`오답입니다. 정답은 ${state.answer}입니다. 잔액은 차감되지 않습니다.`};
}
async function minigameStop(ctx) {
    const stopped=await repo.rows(ctx.db,"SELECT type FROM minigame_sessions WHERE user_id=? AND status='active'",[ctx.user.id]);
    await repo.rows(ctx.db,"UPDATE minigame_sessions SET status='complete',finished_at=? WHERE user_id=? AND status='active'",[ctx.now,ctx.user.id]);
    return {stopped:stopped.map(row=>({game:row.type})),message:stopped.length?'미니게임을 중지했습니다.':'진행 중인 미니게임이 없습니다.'};
}
module.exports={minigameStart,minigameHide,minigameAnswer,minigameStop};
