// Pure accounting classification: never count a bonus credit as a cash deposit.
const stamp=s=>{const m=String(s||'').match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);return m?Date.UTC(+m[3],+m[2]-1,+m[1],+m[4],+m[5],+m[6]):NaN;};
const isDeposit=r=>/^deposit(?:\s*\([^)]*\))?$/i.test(r.info||'')&&Number(r.amount)>0;
const isAutomated=r=>/\(PGA\)/i.test(r.info||'')||/^(PGA|PG|PAYMENT\s*GATEWAY)$/i.test(r.by||'');
const isManual=r=>isDeposit(r)&&!isAutomated(r);
export function classifyDeposits(rows){
 const deposits=rows.filter(isDeposit).filter(r=>Number.isFinite(stamp(r.date))).sort((a,b)=>stamp(a.date)-stamp(b.date));
 const used=new Set(); const pairs=[];
 for(let j=0;j<deposits.length;j++){
  const bonus=deposits[j];if(!isManual(bonus)||used.has(j))continue;
  const matches=[];
  for(let i=0;i<j;i++){
   const dp=deposits[i];if(used.has(i))continue;
   const minutes=(stamp(bonus.date)-stamp(dp.date))/60000;
   if(minutes<=0||minutes>120)continue;
   const freebet=minutes<=60&&dp.amount>=50000&&bonus.amount===Math.min(dp.amount*.5,500000);
   const daily=dp.amount>=100000&&bonus.amount===5000;
   if(!freebet&&!daily)continue;
   matches.push({i,kind:freebet?'FREEBET':'DAILY',minutes});
  }
  // Only associate an unambiguous matching deposit, do not assign the same cash DP to multiple credits.
  if(matches.length!==1)continue;
  const match=matches[0];used.add(j);used.add(match.i);
  pairs.push({kind:match.kind,amount:bonus.amount,deposit:deposits[match.i].amount,depositTime:deposits[match.i].date,bonusTime:bonus.date,minutes:match.minutes,confidence:'INDIKASI'});
 }
 const bonusIndices=new Set([...used].filter(i=>isManual(deposits[i])));
 // Exclude every observed manual credit from cash deposits unless independently verified as cash.
 const cash=deposits.filter((r,i)=>isAutomated(r)&&!bonusIndices.has(i));
 const latestCash=cash.at(-1)||null;
 const latestPair=pairs.at(-1)||null;
 const bonus=latestPair&&latestCash&&latestPair.depositTime===latestCash.date&&latestPair.deposit===latestCash.amount?latestPair:null;
 return {deposit:latestCash,bonus,manualCredits:deposits.filter(isManual),unclassifiedManual:deposits.filter((r,i)=>isManual(r)&&!bonusIndices.has(i)),cashDeposits:cash};
}
