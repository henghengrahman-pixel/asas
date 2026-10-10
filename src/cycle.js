import {reportDate} from './report-date.js';

// Panel timestamps are wall-clock times in REPORT_TIMEZONE (default WIB).
export function panelTimestamp(value){
 const s=String(value||'');
 const m=s.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/)||s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
 if(!m)return null;
 const iso=/^\d{4}/.test(s);
 const [year,month,day,hour,min,sec]=iso?[m[1],m[2],m[3],m[4],m[5],m[6]]:[m[3],m[2],m[1],m[4],m[5],m[6]];
 const stamp=`${year}-${month}-${day} ${hour}:${min}:${sec||'00'}`;
 return {stamp,date:`${day}-${month}-${year}`};
}
export function cycleWindow(depositDate, now=new Date(),zone=process.env.REPORT_TIMEZONE||'Asia/Jakarta'){
 const start=panelTimestamp(depositDate);
 const end=reportDate(now,zone);
 if(!start)return {from:end,to:end,verified:false};
 const key=d=>d.slice(6,10)+d.slice(3,5)+d.slice(0,2);
 if(key(start.date)>key(end))return {from:end,to:end,verified:false};
 return {from:start.date,to:end,verified:true,depositStamp:start.stamp};
}
export function eligibleBets(rows,depositDate,now=new Date(),zone=process.env.REPORT_TIMEZONE||'Asia/Jakarta',slotOnly=false){
 const start=panelTimestamp(depositDate);if(!start)return null;
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const v=Object.fromEntries(fmt.formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 const end=`${v.year}-${v.month}-${v.day} ${v.hour}:${v.minute}:${v.second}`;
 const filtered=rows.filter(r=>r.type==='BET'&&(!slotOnly||/slot/i.test(r.game||r.description||''))&&panelTimestamp(r.date)?.stamp>=start.stamp&&panelTimestamp(r.date)?.stamp<=end);
 return {total:filtered.reduce((sum,r)=>sum+Number(r.debit||0),0),count:filtered.length};
}
