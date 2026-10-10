import {setting,decrypt} from './store.js';
import {Agent,auditMember} from './adapter.js';

import {reportDate} from './report-date.js';
export async function runCheck(user){
  if(!/^[a-z][a-z0-9_]{2,24}$/i.test(user))throw Error('User ID tidak valid');
  const encrypted=await setting('agent_cookie');
  if(!encrypted)throw Error('Session agent belum dipasang');
  const agent=new Agent(process.env.AGENT_BASE_URL||'https://agwl5.suksesbogil.com',decrypt(encrypted));
  const today=reportDate();
  return auditMember(agent,user,today,today,new Date());
}
