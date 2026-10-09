import test from 'node:test';import assert from 'node:assert/strict';import {parseReport,evaluateTO,formatAudit} from '../src/engine.js';
test('parsing grup',()=>assert.deepEqual(parseReport('ID : lurin21\nWD 4.2 juta ko'),{user:'lurin21',type:'WD',amount:4200000}));
test('bonus harian',()=>assert.equal(evaluateTO({deposit:100000,bonusKind:'DAILY',turnover:300000,verified:true}).remaining,225000));
test('freebet',()=>assert.equal(evaluateTO({deposit:100000,bonusKind:'FREEBET',bonusAmount:50000,turnover:1500000,verified:true}).status,'TERCAPAI'));
test('unverified',()=>assert.equal(evaluateTO({deposit:100000,turnover:null}).remaining,null));
test('reply',()=>assert.match(formatAudit({user:'lurin21',type:'WD',amount:4200000,check:{withdraw:4225000}}),/Rp25.000/));
