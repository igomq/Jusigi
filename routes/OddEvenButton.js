const {respond}=require('../util/command');
module.exports={name:'OddEvenButton',command:async(c,i,d)=>{
    if(d.choice==='cancel')return i.update({content:'취소했습니다.',components:[]});
    await i.deferUpdate();
    const result=await c.economy.execute(i.user.id,'oddeven:'+d.nonce,'gamble',{game:'oddeven',choice:d.choice,amount:d.amount});
    await i.editReply({components:[]});return respond(i,result);
}};
