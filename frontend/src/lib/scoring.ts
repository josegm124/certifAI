import { DOMAINS, QUESTIONS, FRAMEWORKS, type Domain, type FrameworkKey } from './data';
export interface Answer { score?:number; attested?:boolean; note?:string; detail?:string }
export type Answers=Record<number,Answer>;
export interface DomainScore extends Domain {answeredCount:number;totalCount:number;rawAvg:number;pct:number}
export function domainScores(answers:Answers):DomainScore[]{return DOMAINS.map(d=>{const qs=QUESTIONS.filter(q=>q.domain===d.id);const answered=qs.filter(q=>answers[q.id]?.score!=null);const sum=answered.reduce((a,q)=>a+(answers[q.id].score as number),0);return{...d,answeredCount:answered.length,totalCount:qs.length,rawAvg:answered.length?sum/answered.length:0,pct:answered.length?Math.round(sum/(answered.length*5)*100):0};});}
export function overallScore(answers:Answers){const ds=domainScores(answers);const w=ds.reduce((a,d)=>a+(d.answeredCount?d.weight:0),0);return w?Math.round(ds.reduce((a,d)=>a+(d.answeredCount?d.pct*d.weight:0),0)/w):0;}
export interface FrameworkCoverage{k:FrameworkKey;name:string;pct:number}
export function frameworkCoverage(answers:Answers):FrameworkCoverage[]{return(Object.entries(FRAMEWORKS)as[FrameworkKey,string][]).map(([k,name])=>{const qs=QUESTIONS.filter(q=>q.frameworks.includes(k));const ans=qs.filter(q=>answers[q.id]?.score!=null);const sum=ans.reduce((a,q)=>a+(answers[q.id].score as number),0);return{k,name,pct:ans.length?Math.round(sum/(ans.length*5)*100):0};});}
export interface Gap{id:number;title:string;domainName:string;domainId:string;score:number;priority:number;gapSize:number;evidence:string[];frameworks:FrameworkKey[]}
export function gapAnalysis(answers:Answers):Gap[]{const dm=Object.fromEntries(DOMAINS.map(d=>[d.id,d]));return QUESTIONS.filter(q=>answers[q.id]?.score!=null).map(q=>{const score=answers[q.id].score as number;return{id:q.id,title:q.title,domainName:dm[q.domain].name,domainId:q.domain,score,priority:(5-score)*dm[q.domain].weight,gapSize:5-score,evidence:q.evidence,frameworks:q.frameworks};}).filter(g=>g.gapSize>0).sort((a,b)=>b.priority-a.priority);}
export function completion(answers:Answers){const answered=QUESTIONS.filter(q=>answers[q.id]?.score!=null).length;return{answered,total:QUESTIONS.length,pct:Math.round(answered/QUESTIONS.length*100)};}
export type LevelId='A1'|'A2'|'A3'|'A4';
export interface Level{id:LevelId;name:string;min:number;max:number;badge:boolean;blurb:string;needsEvidence:boolean;needsSignature:boolean}
export const LEVELS:Level[]=[
{id:'A1',name:'Aware',min:0,max:40,badge:false,needsEvidence:false,needsSignature:false,blurb:'Assessment completed and gaps understood. An internal readiness signal.'},
{id:'A2',name:'Aligned',min:41,max:65,badge:true,needsEvidence:true,needsSignature:true,blurb:'The readiness score is in the Aligned band.'},
{id:'A3',name:'Assured',min:66,max:85,badge:true,needsEvidence:true,needsSignature:true,blurb:'The readiness score is in the Assured band.'},
{id:'A4',name:'Advanced',min:86,max:100,badge:true,needsEvidence:true,needsSignature:true,blurb:'The readiness score is in the Advanced band.'}];
export function levelById(id:LevelId){return LEVELS.find(l=>l.id===id) as Level;}
export function resolveLevel(answers:Answers){const overall=overallScore(answers);return{overall,level:LEVELS.find(l=>overall>=l.min&&overall<=l.max)??LEVELS[0]};}
