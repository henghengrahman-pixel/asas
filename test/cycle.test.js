import test from 'node:test';
import assert from 'node:assert/strict';
import {cycleWindow,eligibleBets} from '../src/cycle.js';
test('DP yesterday spans to today in WIB',()=>{
 const w=cycleWindow('09-10-2026 20:00:00',new Date('2026-10-10T03:00:00Z'));
 assert.deepEqual([w.from,w.to,w.verified],['09-10-2026','10-10-2026',true]);
});
test('timezone midnight from UTC',()=>{
 const w=cycleWindow('09-10-2026 23:55:00',new Date('2026-10-09T17:20:00Z'));
 assert.equal(w.to,'10-10-2026');
});
test('bets before main deposit excluded; after counted',()=>{
 const rows=[{date:'2026-10-09 19:59:00',type:'BET',debit:20000},{date:'2026-10-09 20:30:00',type:'BET',debit:40000},{date:'2026-10-10 09:00:00',type:'BET',debit:10000},{date:'2026-10-10 12:00:00',type:'BET',debit:50000}];
 const s=eligibleBets(rows,'09-10-2026 20:00:00',new Date('2026-10-10T03:00:00Z'));
 assert.equal(s.total,50000);assert.equal(s.count,2);
});
test('freebet restricts eligible bets to SLOT',()=>{
 const rows=[{date:'2026-10-09 20:30:00',type:'BET',game:'SLOT',debit:20000},{date:'2026-10-09 20:31:00',type:'BET',game:'SICBO',debit:90000}];
 assert.equal(eligibleBets(rows,'09-10-2026 20:00:00',new Date('2026-10-10T03:00:00Z'),'Asia/Jakarta',true).total,20000);
});
