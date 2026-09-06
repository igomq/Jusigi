module.exports=client=>{
    client.actionSet=new Map(['BankruptButton','OddEvenButton','FiveAskButton','FiveAskModal','NonsenseButton'].map(name=>[name,require(`../routes/${name}`)]));
};
