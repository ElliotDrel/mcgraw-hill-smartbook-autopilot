const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = process.argv[2] || require('node:path').resolve(__dirname, '..');
const read = name => fs.readFileSync(`${root}/${name}`, 'utf8');
(async () => {
 let stored = {}, calls = [], listener, install, opened = 0;
 const ctx = vm.createContext({console: {log(){},error(){},warn(){}}, AbortSignal, setTimeout,
 chrome: {storage: {local: {get: async () => stored}}, runtime: {id:'extension', onInstalled: {addListener(fn){install=fn;}}, openOptionsPage(){opened++;}, onMessage: {addListener(fn){listener=fn;}}}},
 fetch: async (url, options) => { calls.push({url,options}); return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({choice_letter:'A',choice_index:0,answer_text:'Answer',reasoning:'Test'})}]}]})}; }
 });
 ctx.importScripts = (...names) => names.forEach(name=>vm.runInContext(read(name),ctx));
 vm.runInContext(read('background.js'),ctx);
 install({reason:'install'});install({reason:'update'});assert.equal(opened,1);
 let result = await vm.runInContext("askLLM('Question', ['Answer'], 'multiple_choice')",ctx);
 assert.equal(result.success,false);assert.equal(calls.length,0);
 stored={openaiApiKey:'sk-test-fixture-not-a-real-key'};
 result=await vm.runInContext("askLLM('Question', ['Answer'], 'multiple_choice')",ctx);
 assert.equal(result.success,true);assert.equal(result.choiceIndex,0);
 assert.equal(calls[0].options.headers.Authorization,`Bearer ${stored.openaiApiKey}`);
 assert.equal(JSON.parse(calls[0].options.body).store,false);
 stored.aiDisabled=true;
 result=await vm.runInContext("askLLM('Question', ['Answer'], 'multiple_choice')",ctx);
 assert.equal(result.success,false);assert.equal(calls.length,1);
 let denied;
 listener({action:'askLLM'},{id:'extension',tab:{url:'https://example.com/'}},r=>denied=r);assert.equal(denied.success,false);
 listener({action:'askLLM',question:3,choices:[],questionType:'multiple_choice'},{id:'extension',tab:{url:'https://learning.mheducation.com/'}},r=>denied=r);assert.equal(denied.success,false);
 const client=vm.createContext({chrome:{runtime:{sendMessage:async()=>{throw Error('Disconnected');}}}});
 vm.runInContext(read('llm-client.js'),client);
 assert.equal((await vm.runInContext("askLLM('Q',[],'fill_in_blank')",client)).success,false);
 const elements = Object.fromEntries(['key','status','settings','skip','remove'].map(id=>[id,{value:'',addEventListener(type,fn){this[type]=fn;}}]));
 stored={};
 const ui=vm.createContext({document:{getElementById:id=>elements[id]},chrome:{storage:{local:{get:async()=>stored,set:async value=>Object.assign(stored,value),remove:async key=>delete stored[key]}}}});
 vm.runInContext(read('settings.js'),ui); await Promise.resolve();
 elements.key.value='invalid';await elements.settings.submit({preventDefault(){}});assert.equal(stored.openaiApiKey,undefined);
 elements.key.value='sk-test-fixture-not-a-real-key';await elements.settings.submit({preventDefault(){}});assert.equal(stored.aiDisabled,false);assert.equal(elements.key.value,'');
 await elements.skip.click();assert.equal(stored.openaiApiKey,undefined);assert.equal(stored.aiDisabled,true);
 console.log('PASS: first-install onboarding, keyless/no-network mode, AI request/parsing, disable AI, sender validation, disconnected fallback, settings save/remove.');
})().catch(error=>{console.error(error);process.exitCode=1;});
