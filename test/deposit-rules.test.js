import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyDeposits} from '../src/deposit-rules.js';
const r=(date,info,amount,by='PGA')=>({date,info,amount,by});
test('cash DP remains distinct from 5000 daily bonus',()=>{
 const v=classifyDeposits([r('09-10-2026 10:10:00','Deposit',5000,'operator'),r('09-10-2026 10:00:00','Deposit (PGA)',100000)]);
 assert.equal(v.deposit.amount,100000);assert.equal(v.bonus.kind,'DAILY');assert.equal(v.bonus.amount,5000);
});
test('freebet matched within 60 minutes',()=>{
 const v=classifyDeposits([r('09-10-2026 10:00:00','Deposit (PGA)',100000),r('09-10-2026 10:40:00','Deposit',50000,'operator')]);
 assert.equal(v.bonus.kind,'FREEBET');assert.equal(v.deposit.amount,100000);
});
test('manual credit alone must not become deposit',()=>{
 const v=classifyDeposits([r('09-10-2026 10:10:00','Deposit',5000,'operator')]);
 assert.equal(v.deposit,null);assert.equal(v.bonus,null);assert.equal(v.unclassifiedManual.length,1);
});
test('no automatic bonus pairing outside 60 min freebet',()=>{
 const v=classifyDeposits([r('09-10-2026 10:00:00','Deposit (PGA)',100000),r('09-10-2026 11:20:00','Deposit',50000,'operator')]);
 assert.equal(v.bonus,null);assert.equal(v.deposit.amount,100000);
});
test('ambiguous multiple deposits does not claim verified pairing',()=>{
 const v=classifyDeposits([r('09-10-2026 10:00:00','Deposit (PGA)',100000),r('09-10-2026 10:10:00','Deposit (PGA)',200000),r('09-10-2026 10:20:00','Deposit',5000,'operator')]);
 assert.equal(v.bonus,null);assert.equal(v.deposit.amount,200000);
});
