import test from 'node:test';import assert from 'node:assert/strict';import {parseReport,evaluateTO,formatAudit} from '../src/engine.js';
test('parsing grup',()=>assert.deepEqual(parseReport('ID : lurin21\nWD 4.2 juta ko'),{user:'lurin21',type:'WD',amount:4200000}));
test('bonus harian',()=>assert.equal(evaluateTO({deposit:100000,bonusKind:'DAILY',turnover:300000,verified:true}).remaining,225000));
test('freebet',()=>assert.equal(evaluateTO({deposit:100000,bonusKind:'FREEBET',bonusAmount:50000,turnover:1500000,verified:true}).status,'TERCAPAI'));
test('unverified',()=>assert.equal(evaluateTO({deposit:100000,turnover:null}).remaining,null));
test('reply',()=>assert.match(formatAudit({user:'lurin21',type:'WD',amount:4200000,check:{withdraw:4225000}}),/Rp25.000/));
test('parse angka staf dengan tanda ribuan dan singkatan',()=>{for(const [message,amount] of [['ID cuahyaya Withdraw 4,500,000 ko',4500000],['ID puk4444 WD 15 jt ya',15000000],['ID yupa15 dp 50jt ko',50000000],['ID jpmorgan DP 5 juta',5000000],['ID kingsulaiman WD 8 juta ya ko',8000000]])assert.equal(parseReport(message)?.amount,amount,message)});
test('laporan gabungan DP dan WD diprioritaskan WD',()=>assert.equal(parseReport('ID rob2121 DP 100000 WD 250000')?.type,'WD'));
