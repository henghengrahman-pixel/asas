import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldHandleGroupMessage} from '../src/group-policy.js';
const message={chat:{id:-1001234567890,type:'supergroup'},from:{id:777,is_bot:false},text:'ID lurin21 WD 4.2 juta'};
test('non-admin member in approved group can trigger audit',()=>assert.equal(shouldHandleGroupMessage(message,'-1001234567890'),true));
test('unapproved group cannot trigger audit',()=>assert.equal(shouldHandleGroupMessage(message,'-1005555555'),false));
test('private chat rejected',()=>assert.equal(shouldHandleGroupMessage({...message,chat:{id:-1001234567890,type:'private'}},'-1001234567890'),false));
test('other bots ignored',()=>assert.equal(shouldHandleGroupMessage({...message,from:{id:99,is_bot:true}},'-1001234567890'),false));
test('anonymous channel senders ignored',()=>assert.equal(shouldHandleGroupMessage({...message,sender_chat:{id:-1001234567890}},'-1001234567890'),false));
