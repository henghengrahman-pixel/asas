export const money = v => {const s=String(v??'').trim().replace(/\s/g,''); if(!s)return 0;const neg=s.startsWith('-');const digits=s.replace(/[^\d.,]/g,'');let n;if(/^\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?$/.test(digits)){const pos=Math.max(digits.lastIndexOf('.'),digits.lastIndexOf(','));n=digits.length-pos-1===2?Number(digits.slice(0,pos).replace(/[.,]/g,'')+'.'+digits.slice(pos+1)):Number(digits.replace(/[.,]/g,''));}else n=Number(digits.replace(/,/g,''));return Number.isFinite(n)?(neg?-n:n):0};
export const rupiah=n=>'Rp'+Math.round(n).toLocaleString('id-ID');
export function parseReport(text){const id=String(text).match(/\b(?:ID|USER(?:ID)?)\s*[:=\-]?\s*([a-z][a-z0-9_]{2,24})\b/i);const type=String(text).match(/\b(WD|WITHDRAW)\b/i)||String(text).match(/\b(DP|DEPO|DEPOSIT)\b/i);if(!id||!type)return null;const rest=text.slice(type.index+type[0].length);const match=rest.match(/^\s*[:=\-]?\s*(\d[\d.,]*)(?:\s*(juta|jt|ribu|rb|k))?\b/i);let amount=null;if(match){const raw=match[1],unit=(match[2]||'').toLowerCase();if(unit){const decimal=Number(raw.replace(',','.'));if(Number.isFinite(decimal))amount=Math.round(decimal*(unit==='juta'||unit==='jt'?1e6:1e3));}else{const dec=/^\d+[.,]\d{1,2}$/.test(raw)?Number(raw.replace(',','.')):Number(raw.replace(/[.,]/g,''));if(Number.isFinite(dec))amount=Math.round(dec)}}return {user:id[1].toLowerCase(),type:/^w/i.test(type[1])?'WD':'DP',amount:amount>0?amount:null};}
export function bonusTarget(deposit,kind,bonusAmount){if(kind==='DAILY')return (deposit+5000)*5;if(kind==='FREEBET')return (deposit+bonusAmount)*10;return deposit}
export function evaluateTO({deposit,bonusKind='NONE',bonusAmount=0,turnover,verified=false}){const target=bonusTarget(deposit,bonusKind,bonusAmount);if(!verified||turnover==null)return {target,remaining:null,status:'BELUM TERVERIFIKASI'};return {target,remaining:Math.max(0,target-turnover),status:turnover>=target?'TERCAPAI':'KURANG'}}
export function formatAudit(a){
 const x=a.check||{};
 const n=v=>v==null?'—':rupiah(v);
 const games=x.gameDetails?.length?x.gameDetails.slice(0,6).map(g=>{
  const result=Number(g.netResult)||0;
  return `${result>0?'✅ MENANG':result<0?'❌ KALAH':'➖ IMPAS'} ${g.game}: ${rupiah(Math.abs(result))}`;
 }):x.wins?.length?x.wins.slice(0,3).map(w=>`✅ MENANG ${w.game}: ${n(w.amount)}`):['Belum terbaca'];
 const bonus=x.bonusKind==='FREEBET'?`FreeBet 50% (indikasi) ${n(x.bonusAmount)}`:x.bonusKind==='DAILY'?`Harian (indikasi) ${n(x.bonusAmount)}`:'Belum terverifikasi';
 const lines=[`🤖 OMTOGEL AUTO AUDIT`,`👤 ${a.user} • ${x.reportDate||'Hari ini'}`,``,`💰 DP: ${n(x.deposit)}   |   WD: ${n(x.withdraw)}`,`🎁 Bonus: ${bonus}`,``,`🏆 HASIL GAME`,...games,``,`📊 TO Hari Ini: ${n(x.turnover)}`,`🎯 Target: ${n(x.target)}   |   Sisa valid: ${n(x.remaining)}`];
 if(a.type==='WD'&&a.amount!=null&&x.withdraw!=null&&a.amount!==x.withdraw)lines.push(`⚠️ Selisih WD ${rupiah(Math.abs(a.amount-x.withdraw))} (laporan ${rupiah(a.amount)}, transaksi ${rupiah(x.withdraw)})`);
 const unknown=x.remaining==null||x.bonusConfidence!=='VERIFIED';
 lines.push(unknown?'⚠️ PERLU VERIFIKASI':x.remaining>0?'❌ TO KURANG':'✅ TO TERCAPAI');
 const problem=(x.warnings||[]).find(w=>/HTTP 5\d\d|sesi tidak|tidak ditemukan|belum dikenali/i.test(w));
 if(problem)lines.push(`ℹ️ ${problem.slice(0,110)}`);
 return lines.join('\n').slice(0,3900);
}
