import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGameDetails} from '../src/adapter.js';

test('konslet99: detail page returns slot TO and net win, ignores total row',()=>{
 const html=`<html><body><h3>Transaksi Berjalan ( konslet99 )</h3><table>
 <tr><td>No</td><td>Game</td><td>TurnOver</td><td>Player Menang/kalah</td><td>Promotion</td><td>Komisi Agent</td><td>Agent Tagihan</td></tr>
 <tr><td>1</td><td>SLOT</td><td>3,118,400</td><td>5,048,400</td><td>0</td><td>-3,786,300</td><td>-1,262,100</td></tr>
 <tr><td></td><td>Total</td><td>3,118,400</td><td>5,048,400</td><td>0</td><td>-3,786,300</td><td>-1,262,100</td></tr>
 </table></body></html>`;
 const result=parseGameDetails(html,'konslet99');
 assert.equal(result.tableFound,true);
 assert.deepEqual(result.games,[{game:'SLOT',turnover:3118400,netResult:5048400,promotion:0}]);
});

test('detail belonging to another member must be rejected',()=>{
 assert.throws(()=>parseGameDetails('<body>Transaksi Berjalan ( other123 )</body>','konslet99'),/member lain/);
});
