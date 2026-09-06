const test=require('node:test'),assert=require('node:assert/strict');
const {dropChance,hackerSucceeds,acquisitionGrade}=require('../domain/rules');
const {puzzle}=require('../domain/minigames');
test('drop base rates plus credit percentage points, gambling excluded',()=>{
    assert.deepEqual([1,2,3,4].map(c=>dropChance('arithmetic',c)),[.2,.15,.1,.1]);
    assert.equal(dropChance('memory',1),.25);assert.equal(dropChance('nonsense',2),.1);
    assert.equal(dropChance('slots',1),0);assert.equal(dropChance('oddeven',1),0);
    assert.equal(acquisitionGrade(.99),4);
});
test('hacker grade/credit scale success chance; grade four disabled',()=>{
    assert.equal(hackerSucceeds(0,2,.949999),true);assert.equal(hackerSucceeds(0,2,.95),false);
    assert.equal(hackerSucceeds(1,3,.499999),true);assert.equal(hackerSucceeds(1,3,.5),false);
    assert.equal(hackerSucceeds(4,3,.57499),true);assert.equal(hackerSucceeds(4,3,.575),false);
    assert.equal(hackerSucceeds(10,4,0),false);
});
test('puzzles are deterministic and memory preserves leading zeroes',()=>{
    assert.equal(puzzle('arithmetic',()=>0).answer,'2');
    assert.equal(puzzle('memory',()=>0).answer,'00000');
    assert.equal(puzzle('memory',()=>.99999).answer,'99999');
    assert.throws(()=>puzzle('unknown',()=>0));
});
