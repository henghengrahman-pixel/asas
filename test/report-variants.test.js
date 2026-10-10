import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReport} from '../src/engine.js';
const examples=[
 ['cia22 wd 8jt','cia22',8000000],['gollok325 wd 5jt','gollok325',5000000],
 ['cia22 withdraw 8 juta','cia22',8000000],['cia22 witdraw 8jt','cia22',8000000],
 ['cia22 wdraw 8jt','cia22',8000000],['cia22 widraw 8jt','cia22',8000000],
 ['cia22 penarikan 8jt','cia22',8000000],['wd 8jt cia22','cia22',8000000],
 ['ID cia22 WD 8000000','cia22',8000000],['cia22 wd','cia22',null],
 ['ID : lurin21\nWD 4.2 juta ko','lurin21',4200000],
 ['gollok325 WD 500rb','gollok325',500000],
 ['Fan gollok325 wd 5jt','gollok325',5000000],
];
for (const [input,user,amount] of examples) test('WD format '+input,()=> assert.deepEqual(parseReport(input),{user,type:'WD',amount}));
test('DP never becomes WD',()=>assert.equal(parseReport('ID rob2121 DP 100000').type,'DP'));
test('unrelated message stays ignored',()=>assert.equal(parseReport('selamat sore semua'),null));
