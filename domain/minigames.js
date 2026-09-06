const {check}=require('./money');
const GAMES={
    arithmetic:{name:'계산게임',reward:5000n,duration:120000,cooldown:300000},
    memory:{name:'기억게임',reward:7000n,duration:60000,cooldown:300000}
};
function puzzle(type,random) {
    check(Object.hasOwn(GAMES,type),'지원하지 않는 미니게임입니다.');
    if(type==='memory') {
        const answer=Array.from({length:5},()=>Math.floor(random()*10)).join('');
        return {question:`다섯 자리를 기억하세요: ${answer}`,answer,phase:'show'};
    }
    const a=1+Math.floor(random()*20),b=1+Math.floor(random()*20),op=Math.floor(random()*3);
    return {question:`${a} ${['+','−','×'][op]} ${b} = ?`,answer:String([a+b,a-b,a*b][op]),phase:'answer'};
}
module.exports={GAMES,puzzle};
