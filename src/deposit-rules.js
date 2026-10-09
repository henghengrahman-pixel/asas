// Derive candidate cash deposits from transaction history. Manual credits can also
// be bonuses, so paired credits remain indicators until operator verification.
const stamp=s=>{const m=String(s||'').match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);return m?Date.UTC(+m[3],+m[2]-1,+m[1],+m[4],+m[5],+m[6]):NaN;};
const isDeposit=r=>/^(?:deposit(?:\s*\([^)]*\))?|deposit dana manual|accept deposit)$/i.test(r.info||'')&&Number(r.amount)>0;
const isAutomated=r=>/\(PGA\)/i.test(r.info||'')||/^(PGA|PG|PAYMENT\s*GATEWAY)$/i.test(r.by||'');
const isManual=r=>isDeposit(r)&&!isAutomated(r);
export function classifyDeposits(rows){
 const deposits=rows.filter(isDeposit).filter(r=>Number.isFinite(stamp(r.date))).sort((a,b)=>stamp(a.date)-stamp(b.date));
 const assigned=new Set(),pairs=[];
 for(let j=0;j<deposits.length;j++){
  const bonus=deposits[j];if(!isManual(bonus)||assigned.has(j))continue;
  const matches=[];
  for(let i=0;i<j;i++){
   const dp=deposits[i];if(assigned.has(i)||dp.amount<50000)continue;
   const minutes=(stamp(bonus.date)-stamp(dp.date))/60000;
   if(minutes<=0||minutes>120)continue;
   const freebet=minutes<=60&&bonus.amount===Math.min(dp.amount*.5,500000);
   const daily=dp.amount>=100000&&bonus.amount===5000;
   if(freebet||daily)matches.push({i,kind:freebet?'FREEBET':'DAILY',minutes});
  }
  if(matches.length!==1)continue;
  const match=matches[0];assigned.add(j);assigned.add(match.i);
  pairs.push({kind:match.kind,amount:bonus.amount,deposit:deposits[match.i].amount,depositTime:deposits[match.i].date,bonusTime:bonus.date,minutes:match.minutes,confidence:'INDIKASI'});
 }
 const bonusTimes=new Set(pairs.map(p=>p.bonusTime));
 // 5000 manual credits can be bonuses without a visible matching deposit;
 // NEVER silently promote them to principal cash deposits.
 const cash=deposits.filter(r=>!bonusTimes.has(r.date)&&!(isManual(r)&&r.amount===5000));
 const latestCash=cash.at(-1)||null;
 const latestPair=[...pairs].reverse().find(p=>latestCash&&p.depositTime===latestCash.date&&p.deposit===latestCash.amount)||null;
 return {deposit:latestCash,bonus:latestPair,manualCredits:deposits.filter(isManual),unclassifiedManual:deposits.filter(r=>isManual(r)&&!bonusTimes.has(r.date)&&r.amount===5000),cashDeposits:cash,pairs};
}
export function historyToAccountingRows(rows){return rows.filter(r=>/^deposit$/i.test(r.status||'')&&r.credit>0).map(r=>({date:r.date.replace(/^(\d{4})-(\d{2})-(\d{2})/,'$3-$2-$1'),info:/deposit dana manual/i.test(r.description)?'Deposit Dana Manual':'Deposit',by:/manual/i.test(r.description)?'operator':'PGA',amount:r.credit}));}
