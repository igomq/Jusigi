const {respond}=require('../util/command');
module.exports={name:'BankruptButton',command:async(c,i,d)=>{
    if(!d.action)return i.update({content:'파산신청을 취소했습니다.',components:[]});
    await i.deferUpdate();
    const result=await c.economy.execute(i.user.id,'bankrupt:'+d.nonce,'bankrupt');
    await i.editReply({components:[]});return respond(i,result);
}};
