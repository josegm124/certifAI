import{describe,expect,it}from'vitest';import{QUESTIONS}from'./data';import{completion,domainScores,gapAnalysis,overallScore,resolveLevel,type Answers}from'./scoring';
const filled=(score:number):Answers=>Object.fromEntries(QUESTIONS.map(q=>[q.id,{score}]));
describe('readiness presentation helpers',()=>{
 it('uses all canonical questions',()=>expect(completion(filled(3))).toEqual({answered:QUESTIONS.length,total:QUESTIONS.length,pct:100}));
 it('computes the weighted readiness score',()=>expect(overallScore(filled(4))).toBe(80));
 it('reports the real score band without certificate caps',()=>{const a=filled(5);a[17]={score:0};const r=resolveLevel(a);expect(r.level.id).toBe('A4');expect(r.overall).toBeGreaterThan(90);});
 it('computes domain analytics',()=>expect(domainScores(filled(3)).every(d=>d.pct===60)).toBe(true));
 it('orders gaps only by gap size and domain weight',()=>expect(gapAnalysis(filled(2))[0].priority).toBeGreaterThan(0));
});
