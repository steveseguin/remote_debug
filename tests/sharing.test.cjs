const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function setup(search='') {
 const els={}; const timers=[]; let copies=0;
 const el=id=>els[id]??=( {value:'',textContent:id==='connectBtn'?'Connect':'',disabled:false,style:{},innerHTML:'',listeners:{},contentWindow:{postMessage(){}},addEventListener(k,fn){this.listeners[k]=fn},click(){if(!this.disabled)this.listeners.click?.()},select(){}} );
 const ctx={URL,console:{log(){},warn(){},error(){},info(){}},document:{getElementById:el,execCommand(){copies++;}},window:{location:{search,href:'https://example.test/'+search},history:{pushState(){}},addEventListener(){}},setTimeout(fn){timers.push(fn)},alert(){}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {els,ctx,timers,get copies(){return copies}};
}
const test=require('node:test');
test('sharing stays disabled until a valid connection starts',()=>{
 const s=setup();assert.equal(s.els.shareLink.disabled,true);assert.equal(s.els.copyLinkBtn.disabled,true);
 s.els.roomName.value=' ';s.els.connectBtn.click();assert.equal(s.els.copyLinkBtn.disabled,true);
});
test('manual connection enables link selection and Copy before a peer joins',()=>{
 const s=setup();s.els.roomName.value='review-room';s.els.connectBtn.click();
 assert.equal(s.els.connectBtn.textContent,'Disconnect');assert.equal(s.els.shareLink.value,'https://example.test/?room=review-room');
 assert.equal(s.els.shareLink.disabled,false);assert.equal(s.els.copyLinkBtn.disabled,false);s.els.copyLinkBtn.click();assert.equal(s.copies,1);
 vm.runInContext('handleConnectionEvents({action:"guest-connected",streamID:"peer1",value:{label:"test"}})',s.ctx);
 assert.equal(s.els.statusIndicator.style.backgroundColor,'#00ff00');assert.equal(s.els.copyLinkBtn.disabled,false);
});
test('disconnect disables sharing and reconnect updates and enables it',()=>{
 const s=setup();s.els.roomName.value='first-room';s.els.connectBtn.click();s.els.connectBtn.click();
 assert.equal(s.els.connectBtn.textContent,'Connect');assert.equal(s.els.shareLink.disabled,true);assert.equal(s.els.copyLinkBtn.disabled,true);
 s.els.copyLinkBtn.click();assert.equal(s.copies,0);
 s.els.roomName.value='second-room';s.els.connectBtn.click();assert.equal(s.els.shareLink.value,'https://example.test/?room=second-room');
 assert.equal(s.els.shareLink.disabled,false);s.els.copyLinkBtn.click();assert.equal(s.copies,1);
});
test('URL auto-connect enables sharing',()=>{
 const s=setup('?room=shared-room');s.timers.shift()();assert.equal(s.els.connectBtn.textContent,'Disconnect');
 assert.equal(s.els.shareLink.disabled,false);assert.equal(s.els.copyLinkBtn.disabled,false);s.els.copyLinkBtn.click();assert.equal(s.copies,1);
});
