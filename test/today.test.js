import test from 'node:test';
import assert from 'node:assert/strict';
import {reportDate} from '../src/report-date.js';
test('report date WIB correct across UTC midnight boundary',()=>{
  assert.equal(reportDate(new Date('2026-10-09T16:59:59Z')),'09-10-2026');
  assert.equal(reportDate(new Date('2026-10-09T17:00:00Z')),'10-10-2026');
});
test('report timezone configurable',()=>assert.equal(reportDate(new Date('2026-10-09T16:00:00Z'),'Asia/Makassar'),'10-10-2026'));
