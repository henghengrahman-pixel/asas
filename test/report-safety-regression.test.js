import test from 'node:test';
import assert from 'node:assert/strict';
import {formatAudit,parseReport} from '../src/engine.js';

test('unknown TO is verification, not TO KURANG, even when panel TO is high',()=>{
 const message=formatAudit({user:'dewaraka055',check:{deposit:3000000,withdraw:2400000,turnover:39027000,target:3000000,eligibleTurnover:null,remaining:null,reportDate:'10-10-2026',gameDetails:[{game:'SLOT',netResult:-2790150}],warnings:['TO panel ada tetapi baris taruhan tidak terbaca']}});
 assert.match(message,/Rp39\.027\.000/);
 assert.match(message,/TO valid: Belum tersedia/);
 assert.match(message,/PERLU VERIFIKASI/);
 assert.doesNotMatch(message,/TO KURANG|Selisih WD/);
});
test('bonus indicator appears and WD-only parsing remains',()=>{
 const m=formatAudit({user:'member123',check:{deposit:200000,withdraw:100000,bonusKind:'FREEBET',bonusAmount:100000,target:3000000}});
 assert.match(m,/Indikasi FreeBet 50%/);
 assert.match(m,/Rp100\.000/);
 assert.equal(parseReport('member123 dp 200rb').type,'DP');
 assert.equal(parseReport('member123 withdraw 1jt').type,'WD');
});
