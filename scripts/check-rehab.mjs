import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
const dir=path.resolve('work/rehab-qa');
await fs.mkdir(dir,{recursive:true});
for(const name of ['exercises','data']){
 const source=await fs.readFile(`app/${name}.ts`,'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace("'./exercises'","'./exercises.mjs'");
 await fs.writeFile(path.join(dir,`${name}.mjs`),output);
}
const {scheduled,defaultExercisePlans}=await import(path.join(dir,'exercises.mjs'));
const {stateSchema,initialState}=await import(path.join(dir,'data.mjs'));
const legacy=structuredClone(initialState);delete legacy.exercisePlans;legacy.rehab='existing clinician notes';legacy.days['2026-10-10']={checks:['lunch'],pain:'2',skin:'1',sleep:'8',weight:'66',walk:'5',note:'existing daily note',redFlag:false,flare:false};
const upgraded=stateSchema.parse(legacy);
assert.deepEqual(upgraded.days['2026-10-10'],{...legacy.days['2026-10-10'],rehabLocation:'home'});assert.deepEqual(upgraded.plans,legacy.plans);assert.equal(upgraded.rehab,legacy.rehab);
for(let day=0;day<7;day++){const result=scheduled(upgraded.exercisePlans,day);assert.equal(result.length,3);assert(result.every(x=>['breathing','ankle'].includes(x.plan.id)));}
const savedVersion=structuredClone(initialState);savedVersion.exercisePlans=savedVersion.exercisePlans.slice(0,7);savedVersion.exercisePlans[0].reps=7;const migrated=stateSchema.parse(savedVersion);assert.equal(migrated.exercisePlans.length,10);assert.equal(migrated.exercisePlans[0].reps,7);assert.deepEqual(migrated.exercisePlans.slice(0,7),savedVersion.exercisePlans);
for(let day=0;day<7;day++){const desk=scheduled(migrated.exercisePlans,day,'desk');assert.equal(desk.length,4);assert(desk.every(x=>x.plan.id.startsWith('desk')));assert.equal(desk.filter(x=>x.plan.id==='deskankle').length,2);}
const savedDesk=stateSchema.parse({...migrated,days:{'2026-10-10':{...upgraded.days['2026-10-10'],rehabLocation:'desk'}}});assert.equal(savedDesk.days['2026-10-10'].rehabLocation,'desk');
const plans=structuredClone(defaultExercisePlans),bridge=plans.find(x=>x.id==='bridge');bridge.enabled=true;
assert(!scheduled(plans,0).some(x=>x.plan.id==='bridge'));
bridge.approved=true;assert(!scheduled(plans,0).some(x=>x.plan.id==='bridge'));
bridge.confirmedDate='2026-10-11';bridge.permissionNote='QA only: low bridge cleared with 5 repetitions';
assert(scheduled(plans,0).some(x=>x.plan.id==='bridge'));assert(!scheduled(plans,0,'desk').some(x=>x.plan.id==='bridge'));assert(!scheduled(plans,1).some(x=>x.plan.id==='bridge'));
const invalid=structuredClone(upgraded);invalid.exercisePlans[0].reps=500;assert(!stateSchema.safeParse(invalid).success);
invalid.exercisePlans=structuredClone(upgraded.exercisePlans);invalid.exercisePlans[1].id=invalid.exercisePlans[0].id;assert(!stateSchema.safeParse(invalid).success);
console.log('Rehab checks passed: pre-tutorial and 7-exercise records preserved; workplace and home schedules separate; daily location saved; permission, weekday and dose guards retained.');
