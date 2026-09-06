const repo=require('../repositories/economy');
const {dropChance,acquisitionGrade,GRADES}=require('../domain/rules');
async function awardDrop({db,user,now,random},game) {
    if(random()>=dropChance(game,user.credit))return null;
    // Premium cash/credit consumables are shop-only; completed quizzes drop passives.
    const items=await repo.rows(db,"SELECT id,name,uses FROM item_definitions WHERE released=TRUE AND type='passive' ORDER BY id FOR SHARE");
    if(!items.length)return null;
    const item=items[Math.floor(random()*items.length)],grade=acquisitionGrade(random());
    const inserted=await repo.rows(db,'INSERT INTO inventory(user_id,item_id,grade,uses_left,acquired_at) VALUES (?,?,?,?,?)',[user.id,item.id,grade,item.uses,now]);
    return {inventoryId:String(inserted.insertId),name:item.name,grade:GRADES[grade]};
}
module.exports={awardDrop};
