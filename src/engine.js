export const money = v => {const s=String(v??'').trim().replace(/\s/g,''); if(!s)return 0;const neg=s.startsWith('-');const digits=s.replace(/[^\d.,]/g,'');let n;if(/^\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?$/.test(digits)){const pos=Math.max(digits.lastIndexOf('.'),digits.lastIndexOf(','));n=digits.length-pos-1===2?Number(digits.slice(0,pos).replace(/[.,]/g,'')+'.'+digits.slice(pos+1)):Number(digits.replace(/[.,]/g,''));}else n=Number(digits.replace(/,/g,''));return Number.isFinite(n)?(neg?-n:n):0};
export const rupiah=n=>'Rp'+Math.round(n).toLocaleString('id-ID');
// Tolerant of common staff spelling mistakes; reject unrelated words and ambiguous IDs.
const WD_WORD = /^(?:wd|withdraw|withdrawal|witdraw|widraw|wdraw|withdrow|widrawal|penarikan|tarik)$/i;
const DP_WORD = /^(?:dp|depo|deposit)$/i;
const MONEY_UNIT = /^(?:jt|juta|rb|ribu|k)$/i;
const ID_WORD = /^(?:id|userid|user|member)$/i;
function parseAmount(tokens, at) {
  const val=tokens[at];
  if (!val || !/^\d[\d.,]*$/.test(val)) return null;
  const unit=MONEY_UNIT.test(tokens[at+1]||'')?tokens[at+1].toLowerCase():'';
  let number;
  if (unit) {
    number=Number(val.replace(/,/g,'.'))*(unit==='jt'||unit==='juta'?1e6:1e3);
  } else {
    number=Number(val.replace(/[.,]/g,''));
  }
  return Number.isSafeInteger(Math.round(number))&&number>0?Math.round(number):null;
}
export function parseReport(input) {
  const text=String(input??'').trim();
  if (!text || text.length>1500) return null;
  const normalized=text.replace(/(\d[\d.,]*)(jt|juta|rb|ribu|k)\b/gi,'$1 $2');
  const tokens=(normalized.match(/[a-z0-9_]+(?:[.,][0-9]+)*/gi)||[]);
  const wdIndexes=tokens.flatMap((v,i)=>WD_WORD.test(v)?[i]:[]);
  const dpIndexes=tokens.flatMap((v,i)=>DP_WORD.test(v)?[i]:[]);
  if (!wdIndexes.length && !dpIndexes.length) return null;
  const type=wdIndexes.length?'WD':'DP';
  const actions=type==='WD'?wdIndexes:dpIndexes;
  if (actions.length!==1) return null;
  const action=actions[0];
  const amount=parseAmount(tokens,action+1) ?? (parseAmount(tokens,action-1) && !MONEY_UNIT.test(tokens[action-1])?parseAmount(tokens,action-1):null);
  const explicit=[];
  for(let i=0;i<tokens.length-1;i++) if(ID_WORD.test(tokens[i]) && /^[a-z][a-z0-9_]{2,24}$/i.test(tokens[i+1]) && !WD_WORD.test(tokens[i+1]) && !DP_WORD.test(tokens[i+1])) explicit.push(tokens[i+1].toLowerCase());
  if(new Set(explicit).size>1) return null;
  let user=explicit[0];
  if(!user){
    const candidates=[];
    for(let i=0;i<tokens.length;i++){
      const t=tokens[i];
      if(!/^[a-z][a-z0-9_]{2,24}$/i.test(t) || WD_WORD.test(t)||DP_WORD.test(t)||ID_WORD.test(t)||MONEY_UNIT.test(t))continue;
      // Stay adjacent to the WD phrase; ignore commentary and Telegram names.
      if(Math.abs(i-action)<=3) candidates.push({user:t.toLowerCase(),distance:Math.abs(i-action)});
    }
    candidates.sort((a,b)=>a.distance-b.distance);
    if(!candidates.length || (candidates[1]&&candidates[1].distance===candidates[0].distance&&candidates[1].user!==candidates[0].user))return null;
    user=candidates[0].user;
  }
  return {user,type,amount};
}
export function bonusTarget(deposit,kind,bonusAmount){if(kind==='DAILY')return (deposit+5000)*5;if(kind==='FREEBET')return (deposit+bonusAmount)*10;return deposit}
export function evaluateTO({deposit,bonusKind='NONE',bonusAmount=0,turnover,verified=false}){const target=bonusTarget(deposit,bonusKind,bonusAmount);if(!verified||turnover==null)return {target,remaining:null,status:'BELUM TERVERIFIKASI'};return {target,remaining:Math.max(0,target-turnover),status:turnover>=target?'TERCAPAI':'KURANG'}}
export function formatAudit(a){
 const x=a.check||{};
 const n=v=>v==null?'Belum tersedia':rupiah(v);
 const gameLines=x.gameDetails?.length?x.gameDetails.slice(0,8).map(g=>{
  const result=Number(g.netResult)||0;
  return `${result>0?'✅ MENANG':result<0?'❌ KALAH':'➖ IMPAS'} ${g.game}: ${rupiah(Math.abs(result))}`;
 }):x.wins?.length?x.wins.slice(0,5).map(w=>`✅ MENANG ${w.game}: ${n(w.amount)}`):['Belum tersedia'];
 let bonus='Belum terverifikasi';
 if(x.bonusKind==='FREEBET')bonus=`Indikasi FreeBet 50% • ${n(x.bonusAmount)}`;
 else if(x.bonusKind==='DAILY')bonus=`Indikasi Harian • ${n(x.bonusAmount)}`;
 else if(String(x.bonusConfidence||'').startsWith('TIDAK TERDETEKSI'))bonus='Tidak terdeteksi (riwayat diperiksa)';
 const targetKnown=x.target!=null;
 const lines=[
  '🤖 OMTOGEL AUTO AUDIT',
  `👤 ${a.user} | ${x.reportDate||'Hari ini'}`,
  '',
  '💰 TRANSAKSI',
  `DP terakhir: ${n(x.deposit)}`,
  `WD: ${n(x.withdraw)}`,
  `🎁 Bonus: ${bonus}`,
  '',
  '🏆 HASIL GAME', ...gameLines,
  '',
  '📊 TURNOVER',
  `Periode: ${x.turnoverPeriod?.from||'—'} s/d ${x.turnoverPeriod?.to||'—'}`,
  `TO panel: ${n(x.turnover)}`,
  `Target: ${targetKnown?n(x.target)+' (sementara)':'Belum tersedia'}`,
  `TO valid: ${n(x.eligibleTurnover)}`
 ];
 if(x.remaining!=null)lines.push(`Sisa TO: ${n(x.remaining)}`);
 const verified=x.remaining!=null;
 lines.push('', verified?(x.remaining>0?'❌ TO KURANG':'✅ TO TERCAPAI'):'⚠️ PERLU VERIFIKASI');
 if(!verified){
  const issue=(x.warnings||[]).find(w=>/TO panel ada tetapi|TO setelah jam DP|Riwayat belum lengkap|HTTP 5\d\d|sesi tidak/i.test(w));
  lines.push(issue?`ℹ️ ${issue.replace(/^(?:TurnOver|Detail game|Kemenangan):\s*/i,'').slice(0,95)}`:'ℹ️ TO setelah DP / bonus belum dapat dipastikan');
 }
 return lines.join('\n').slice(0,3900);
}
