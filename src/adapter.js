import * as cheerio from 'cheerio';
import {money,evaluateTO} from './engine.js';
import {classifyDeposits,historyToAccountingRows} from './deposit-rules.js';
import {cycleWindow,eligibleBets} from './cycle.js';
import {reconcileTurnover} from './to-reconciliation.js';
const paths=['agentplayerlist.php','history_trans.php','tl_summaryagent.php','masteruserdetil.php','editcoinhis.php','admin_transaksi.php'];
export function safeBase(s){const u=new URL(s);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('Agent base must be HTTPS');return u.origin;}
export class Agent{constructor(base,cookie){this.base=safeBase(base);if(!cookie||/[\r\n]/.test(cookie))throw Error('Cookie sesi tidak valid');this.cookie=cookie;}
 async load(page,{method='GET',form={},query={}}={}){if(!paths.includes(page))throw Error('Path tidak diizinkan');const url=new URL('/'+page,this.base);for(const [k,v] of Object.entries(query))url.searchParams.set(k,String(v));const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);try{const r=await fetch(url,{method,headers:{Cookie:this.cookie,'Content-Type':'application/x-www-form-urlencoded','User-Agent':'OMTOGEL-AUDIT/1.0'},body:method==='POST'?new URLSearchParams(form):undefined,redirect:'manual',signal:controller.signal});if(r.status>=300&&r.status<400)throw Error('Sesi tidak aktif (redirect)');if(!r.ok)throw Error('Panel HTTP '+r.status);const html=await r.text();if(html.length>5_000_000)throw Error('Halaman terlalu besar');if(/type=["']password["']|name=["'](?:password|passwd)["']/i.test(html))throw Error('Sesi tidak valid: panel meminta login');return html;}finally{clearTimeout(timer);}}
}
const clean=(s)=>String(s??'').replace(/\s+/g,' ').trim();
export function parseProfile(html,id){const $=cheerio.load(html);let match=null;$('tr').each((_,el)=>{if(match)return;const t=$(el).children('td');if(t.length<6)return;const member=t.eq(1).clone();member.find('small,span,br').remove();const link=clean(t.eq(1).find('a').first().text());const label=clean(member.text()).split(/\s+/)[0];if((link||label).toLowerCase()!==String(id).toLowerCase())return;match={user:id,balance:money(clean(t.eq(4).text())),joined:clean(t.eq(5).text())||null};});return match;}
export function parseCoin(html){const $=cheerio.load(html);const rows=[];$('tr').each((_,el)=>{const cells=$(el).children('td').map((_,e)=>clean($(e).text())).get();if(cells.length===6&&/^\d+$/.test(cells[0])&&/^\d{2}-\d{2}-\d{4}/.test(cells[1]))rows.push({date:cells[1],info:cells[2],by:cells[3],amount:money(cells[4]),lastCoin:money(cells[5])});});return rows;}
export function parseMemberSummary(html,user){const $=cheerio.load(html);const rows=[];let hasTable=false;let returnedUser=null;const filter=clean($('input[name="addWhere"]').first().val());$('table').each((_,table)=>{const tableEl=$(table);const header=clean(tableEl.find('tr').first().text());const headerText=clean(tableEl.text().slice(0,500));if(!/TurnOver/i.test(headerText)||!/Id Pemain/i.test(headerText))return;hasTable=true;tableEl.find('tr').each((__,el)=>{const td=$(el).children('td');if(td.length<5)return;const memberLink=td.find('a[href*="masteruserdetil.php"]').first();if(!memberLink.length)return;const name=clean(memberLink.text());if(!name)return;returnedUser=name;if(name.toLowerCase()!==String(user).toLowerCase())return;const nums=td.slice(2).map((___,cell)=>clean($(cell).text())).get();if(nums.length<3)return;rows.push({user:name,to:money(nums[0]),netResult:money(nums[1]),promotion:money(nums[2]),link:memberLink.attr('href')||null});});});return {rows,hasTable,filter,returnedUser};}
export function findAgentUsername(html){const $=cheerio.load(html);const action=$('form[action*="tl_summaryagent.php"]').first().attr('action')||'';const match=action.match(/[?&]user=([^&#]+)/);return match?decodeURIComponent(match[1]):null;}
export function parseGameDetails(html, expectedUser){
 const $=cheerio.load(html);
 const body=clean($('body').text());
 const heading=clean(body.match(/Transaksi\s+Berjalan\s*\(\s*([^)]*?)\s*\)/i)?.[1]||'');
 if(heading && heading.toLowerCase()!==String(expectedUser).toLowerCase())throw Error('Detail game milik member lain');
 const games=[];let tableFound=false;
 $('table').each((_,table)=>{
  const trs=$(table).find('tr').toArray();
  const headerIdx=trs.findIndex(row=>{
   const t=clean($(row).text());
   return /\bGame\b/i.test(t)&&/Turn\s*Over/i.test(t)&&/Player\s*Menang\s*\/?\s*kalah/i.test(t);
  });
  if(headerIdx<0)return;
  const headings=$(trs[headerIdx]).children('th,td').map((__,cell)=>clean($(cell).text()).toLowerCase()).get();
  const indexOf=(re)=>headings.findIndex(h=>re.test(h));
  const gameIdx=indexOf(/^game$/i),toIdx=indexOf(/turn\s*over/i),netIdx=indexOf(/player\s*menang\s*\/?\s*kalah/i),promoIdx=indexOf(/promotion/i);
  if([gameIdx,toIdx,netIdx].some(x=>x<0))return;
  tableFound=true;
  for(const row of trs.slice(headerIdx+1)){
   const c=$(row).children('td,th').map((__,cell)=>clean($(cell).text())).get();
   if(c.length<=Math.max(gameIdx,toIdx,netIdx))continue;
   const game=c[gameIdx];
   if(!game||/^(?:total|total all)$/i.test(game))continue;
   if(!/[a-z]/i.test(game))continue;
   games.push({game,turnover:money(c[toIdx]),netResult:money(c[netIdx]),promotion:promoIdx>=0?money(c[promoIdx]):0});
  }
 });
 return {games,tableFound,heading};
}
export function parseHistoryRows(html){const $=cheerio.load(html);const rows=[];$('tr').each((_,el)=>{const c=$(el).children('td').map((__,n)=>clean($(n).text())).get();if(c.length<9||!/^\d+$/.test(c[0])||!/^\d{4}-\d{2}-\d{2}/.test(c[2]))return;rows.push({date:c[2],description:c[3],status:c[4],debit:money(c[5]),credit:money(c[6]),game:clean(c[3].replace(/^(?:menang|beli)\s+/i,'')),type:/^menang$/i.test(c[4])?'WIN':/^beli$/i.test(c[4])?'BET':'OTHER'});});const next=$('a[href*="admin_transaksi.php"]').toArray().map(el=>$(el).attr('href')).find(href=>/\bstart=\d+/.test(href||''));return {rows,next:next||null};}
export function parseHistory(html){return parseHistoryRows(html).rows.filter(x=>x.type==='WIN').map(x=>({game:x.game,amount:x.credit,date:x.date}));}
export async function auditMember(agent,user,from,to,now=new Date()){const warnings=[];let profile=null,coins=[],wins=[],memberSummary=null,historyRows=[],gameDetails=[],summaryOk=false,historyComplete=false,agentUsername=process.env.AGENT_USERNAME||null,detailPanelTO=null;const run=async(label,fn)=>{try{return await fn()}catch(e){warnings.push(`${label}: ${e.message}`);return null}};
 profile=await run('Profil',async()=>parseProfile(await agent.load('agentplayerlist.php',{method:'POST',form:{user,usercheck:'1',cari:'Cari',page:'1'}}),user));
 const coinResult=await run('History coin',async()=>parseCoin(await agent.load('editcoinhis.php',{method:'POST',form:{user,cmdsend:'History Bank'}})));if(coinResult)coins=coinResult;
 const history=await run('Kemenangan',async()=>{let page=await agent.load('admin_transaksi.php',{query:{namauser:user,cariuser:'Cari'}});const combined=[];const seen=new Set();let completed=false;for(let p=0;p<8;p++){const result=parseHistoryRows(page);combined.push(...result.rows);if(!result.next){completed=true;break}const url=new URL(result.next,agent.base);if(url.pathname!=='/admin_transaksi.php'||seen.has(url.search))break;seen.add(url.search);page=await agent.load('admin_transaksi.php',{query:Object.fromEntries(url.searchParams)});}return {rows:combined,complete:completed};});if(history){historyRows=history.rows;historyComplete=history.complete;wins=historyRows.filter(r=>r.type==='WIN').map(r=>({game:r.game,amount:r.credit,date:r.date}));}
 const accountingRows=historyRows.length?historyToAccountingRows(historyRows):coins;
 const classified=classifyDeposits(accountingRows);
 const {bonus,deposit,manualCredits,unclassifiedManual}=classified;
 const window=cycleWindow(deposit?.date,now);
 // Range starts at last principal DP; never treat a bonus timestamp as DP.
 if(deposit){from=window.from;to=window.to;}
 const summary=await run('TurnOver',async()=>{
  const opening=await agent.load('tl_summaryagent.php');
  const username=findAgentUsername(opening)||process.env.AGENT_USERNAME||'';agentUsername=username;
  if(!username)throw Error('Username agent tidak ditemukan dari halaman TO; periksa sesi agent');
  const form={valdate1:from,valdate2:to,game:'ALL',viewplayers:'1',addWhere:user,viewPoker:'1',isNotFirst:'1',submit:'Submit',page:'0'};
  let result=null,postError=null;
  try{result=parseMemberSummary(await agent.load('tl_summaryagent.php',{method:'POST',query:{user:username},form}),user);}
  catch(e){postError=e;}
  if(!result?.rows.length){
   const iso=s=>s.split('-').reverse().join('/');
   const query={user:username,view:'1',views_poker:'1',isNotFirst:'1',date1:iso(from),date2:iso(to),game:'ALL',viewPoker:'1',poker_fraud:'0',addWhere:user};
   try{const alternate=parseMemberSummary(await agent.load('tl_summaryagent.php',{query}),user);if(alternate.rows.length||!result?.hasTable)result=alternate;}
   catch(e){if(!result)throw Error(`POST: ${postError?.message||'gagal'}; GET: ${e.message}`);}
  }
  if(!result)throw postError||Error('TO tidak tersedia');
  return result;
 });if(summary){summaryOk=summary.hasTable;memberSummary=summary.rows.length===1?summary.rows[0]:null;if(!memberSummary&&summary.filter&&summary.filter.toLowerCase()!==user.toLowerCase())warnings.push('Filter TO mengembalikan user berbeda: '+summary.filter);}
 // If the summary request failed (including HTTP 500), attempt the canonical
 // member detail endpoint with the authenticated agent ID and date window.
 const detailLink=memberSummary?.link || (agentUsername ? `masteruserdetil.php?${new URLSearchParams({agentnya:agentUsername,usernya:user,date1:from,date2:to,game:'ALL',viewPoker:'1',poker_fraud:'0'})}` : null);
 if(detailLink){
  const detail=await run('Detail game',async()=>{
   const link=new URL(detailLink,agent.base);
   if(link.origin!==agent.base||link.pathname!=='/masteruserdetil.php')throw Error('Tautan detail tidak valid');
   if((link.searchParams.get('usernya')||'').toLowerCase()!==user.toLowerCase())throw Error('Tautan bukan milik member yang diminta');
   // Use the returned member-specific URL, with the same single-day date range.
   link.searchParams.set('date1',from);link.searchParams.set('date2',to);
   return parseGameDetails(await agent.load('masteruserdetil.php',{query:Object.fromEntries(link.searchParams)}),user);
  });
  if(detail){gameDetails=detail.games;if(detail.tableFound&&gameDetails.length)detailPanelTO=gameDetails.reduce((sum,g)=>sum+g.turnover,0);if(!detail.tableFound)warnings.push('Tabel detail game belum dikenali');else if(!gameDetails.length)warnings.push('Tidak ada baris game pada tanggal pemeriksaan');}
 }

 if(!profile)warnings.push('Profil member belum ditemukan (tidak menghalangi TO/kemenangan)');if(!coins.length)warnings.push('History Coin belum terbaca');if(!summaryOk&&detailPanelTO==null)warnings.push('Tabel laporan TO belum dikenali');else if(!memberSummary&&detailPanelTO==null)warnings.push('Baris TO untuk ID member belum ditemukan');if(!history)warnings.push('Riwayat kemenangan gagal diambil');else if(!historyComplete)warnings.push('Riwayat kemenangan lebih panjang dari batas pencarian; hasil tidak lengkap');
 if(unclassifiedManual.length)warnings.push('Kredit Rp5.000 belum dapat dipastikan sebagai bonus');if(bonus)warnings.push('Bonus terindikasi dari nominal/waktu, perlu konfirmasi operator');if(!historyComplete&&historyRows.length)warnings.push('Riwayat transaksi belum seluruhnya terbaca');
 const turnover=memberSummary?.to??detailPanelTO??null;
 const bonusKind=bonus?.kind||null;
 const targetBase=deposit?.amount??null;
 const target=targetBase==null?null:evaluateTO({deposit:targetBase,bonusKind:bonusKind||'NONE',bonusAmount:bonus?.amount||0,turnover:null}).target;
 // Date-wide panel summaries are informational only; they include any play before DP.
 // Bet transaction rows can establish timestamp eligibility only with complete history.
 const counted=eligibleBets(historyRows,deposit?.date,now,process.env.REPORT_TIMEZONE||'Asia/Jakarta',bonusKind==='FREEBET');
 // Zero eligible bets is only provable when the source is authoritative and complete.
 // When panel reports turnover but history contains no bet entries, the parser
 // may not recognize the upstream BET status: never label such cases TO KURANG.
 const betRows=historyRows.filter(r=>r.type==='BET');
 const reconciliation=reconcileTurnover({panelTurnover:turnover,ledgerRows:historyRows,from,to,historyComplete,eligibleTurnover:counted?.total});
 // A lower partial ledger (e.g. Rp89.400 versus panel Rp721.300)
 // MUST NOT yield a final TO KURANG decision.
 const eligible=window.verified && reconciliation.verified ? counted.total : null;
 if(!reconciliation.verified)warnings.push(reconciliation.reason);
 if(deposit&&!historyComplete)warnings.push('Riwayat belum lengkap: TO sejak DP belum dapat diverifikasi');
 if(deposit&&eligible==null)warnings.push('TO setelah jam DP belum dapat dipastikan');
 if(eligible!=null)warnings.push('TO valid dihitung dari nominal taruhan pada riwayat lengkap; cocokkan dengan laporan panel');
 // Unknown bonus is NOT equivalent to confirmed absence of a bonus.
 const bonusVerifiedAbsent=historyComplete && coins.length>0 && unclassifiedManual.length===0 && manualCredits.length===0;
 const verifiedBonus=bonus ? bonus.confidence==='VERIFIED' : bonusVerifiedAbsent;
 if(!verifiedBonus)warnings.push('Status bonus belum pasti; target hanya sementara');
 const remaining=eligible!=null&&target!=null&&verifiedBonus?Math.max(0,target-eligible):null;
 return {user,profile,gameDetails,netResult:memberSummary?.netResult??(gameDetails.length?gameDetails.reduce((sum,g)=>sum+g.netResult,0):null),reportDate:to,turnoverPeriod:{from,to},deposit:deposit?.amount??null,depositTime:deposit?.date??null,manualCredits:manualCredits.map(r=>({date:r.date,amount:r.amount,by:r.by})),withdraw:historyRows.filter(r=>/^withdraw$/i.test(r.status)).sort((a,b)=>b.date.localeCompare(a.date))[0]?.debit??[...coins].filter(r=>/withdraw/i.test(r.info)).sort((a,b)=>b.date.localeCompare(a.date))[0]?.amount??null,wins,bonusKind,bonusAmount:bonus?.amount??null,bonusConfidence:bonus?.confidence||(bonusVerifiedAbsent?'TIDAK TERDETEKSI (RIWAYAT LENGKAP)':'BELUM TERVERIFIKASI'),turnover,eligibleTurnover:eligible,target,remaining,status:remaining==null?'PERLU VERIFIKASI':remaining>0?'TO KURANG':'TO TERCAPAI',warnings,sources:{coinRows:coins.length,summaryRows:summary?.rows.length||0,historyRows:historyRows.length,historyComplete,turnoverReconciled:reconciliation.verified,ledgerPanelTotal:reconciliation.ledgerTotal??null}};
}
