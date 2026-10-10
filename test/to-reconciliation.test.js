import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileTurnover} from '../src/to-reconciliation.js';
const base={panelTurnover:721300,from:'10-10-2026',to:'10-10-2026',historyComplete:true,eligibleTurnover:89400};
test('bathara22: partial ledger 89,400 versus panel 721,300 is unverified, not TO KURANG',()=>{
 const result=reconcileTurnover({...base,ledgerRows:[{type:'BET',date:'2026-10-10 10:15:00',debit:89400}]});
 assert.equal(result.verified,false);assert.equal(result.ledgerTotal,89400);
});
test('complete ledger agrees with panel while eligible after DP is lower',()=>{
 const result=reconcileTurnover({...base,ledgerRows:[{type:'BET',date:'2026-10-10 09:00:00',debit:631900},{type:'BET',date:'2026-10-10 10:15:00',debit:89400}]});
 assert.equal(result.verified,true);
});
test('no recognized betting rows must not be considered verified if panel TO is positive',()=>{
 assert.equal(reconcileTurnover({...base,ledgerRows:[]}).verified,false);
});
test('incomplete history cannot yield final decision even when values coincide',()=>{
 assert.equal(reconcileTurnover({...base,historyComplete:false,ledgerRows:[{type:'BET',date:'2026-10-10 10:00:00',debit:721300}]}).verified,false);
});
