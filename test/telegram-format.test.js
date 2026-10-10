import test from 'node:test';
import assert from 'node:assert/strict';
import {formatAudit,parseReport} from '../src/engine.js';
test('WD mismatch never disclosed to group',()=>{
 const msg=formatAudit({user:'ojos29',type:'WD',amount:5000000,check:{deposit:1000000,withdraw:5700000,reportDate:'10-10-2026',status:'PERLU VERIFIKASI',warnings:[]}});
 assert.doesNotMatch(msg,/selisih|laporan\s+rp/i);
 assert.match(msg,/WD: Rp5\.700\.000/);
});
test('WD typo accepted, DP-only ignored by rule',()=>{
 assert.deepEqual(parseReport('gollok325 witdraw 5jt'),{user:'gollok325',type:'WD',amount:5000000});
 assert.equal(parseReport('gollok325 depo 5jt').type,'DP');
});
