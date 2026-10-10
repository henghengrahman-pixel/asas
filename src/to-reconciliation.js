import {panelTimestamp} from './cycle.js';
// Daily/period panel TO is the authoritative aggregate. A ledger-derived eligible
// TO can only be trusted if the full set of betting debits reconciles to it.
// Otherwise a partially recognized BET table can falsely report TO KURANG.
export function reconcileTurnover({panelTurnover, ledgerRows, from, to, historyComplete, eligibleTurnover}) {
 if (!historyComplete || eligibleTurnover==null || panelTurnover==null) return {verified:false,reason:'Data riwayat atau TO panel belum lengkap'};
 const key=s=>{const p=panelTimestamp(s);return p?.date.split('-').reverse().join('')||null};
 const start=from?.split('-').reverse().join(''),end=to?.split('-').reverse().join('');
 const bets=ledgerRows.filter(r=>r.type==='BET' && key(r.date)>=start && key(r.date)<=end);
 const ledgerTotal=bets.reduce((sum,r)=>sum+Number(r.debit||0),0);
 const difference=Math.abs(ledgerTotal-panelTurnover);
 // Zero BET rows in a panel with activity must never be treated as zero TO.
 // Allow rounding of fractional coin amounts, not missing game categories.
 const tolerance=Math.max(1,Math.min(5,panelTurnover*0.000001));
 if (difference>tolerance) return {verified:false,ledgerTotal,reason:'TO panel dan total taruhan riwayat tidak cocok; transaksi mungkin tidak lengkap'};
 return {verified:true,ledgerTotal};
}
