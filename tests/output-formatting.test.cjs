const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const html = fs.readFileSync(process.env.REVIEW_SOURCE || path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function createApp() {
  const nodes = new Map();
  const sent = [], calls = [];
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, { value: '', textContent: id === 'connectBtn' ? 'Connect' : '', innerHTML: '', style: {}, disabled: false, scrollTop: 0, scrollHeight: 0, listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; }, select() {}, click() { this.listeners.click?.(); }, contentWindow: { postMessage(data, origin) { sent.push({data, origin}); } } });
    return nodes.get(id);
  }
  const consoleDouble = Object.fromEntries(['log','error','warn','info'].map(method => [method, (...args) => calls.push({method,args})]));
  const originals = {...consoleDouble};
  const sandbox = {
    document: {getElementById:node, execCommand() {}},
    window: {location:{href:'https://fixture.invalid/debug',search:''},history:{pushState(){}},addEventListener(){}},
    console: consoleDouble, URL, setTimeout() {}, alert() {},
  };
  sandbox.window.window = sandbox.window;
  const context = vm.createContext(sandbox);
  vm.runInContext(script, context);
  return {context,nodes,sent,calls,consoleDouble,originals,node,run(code) {return vm.runInContext(code,context);},local(code) {node('codeInput').value=code;node('executeLocalBtn').click();},remote(code) {context.testCode=code;vm.runInContext("handleDataReceived({remoteDebug:{type:'execute',code:testCode}}, 'fixture-peer')",context);}};
}
for (const method of ['log','error','warn','info']) {
  test(`${method} with circular object preserves execution and forwards original call`, () => {
    const a=createApp();a.local(`var cyclic={label:'sample'};cyclic.self=cyclic;console.${method}(cyclic);globalThis.afterLog=true;void 0`);
    assert.equal(a.context.afterLog,true);
    assert.equal(a.calls.length,1);assert.equal(a.calls[0].method,method);assert.equal(a.calls[0].args[0].self,a.calls[0].args[0]);
    for (const key in a.originals) assert.equal(a.consoleDouble[key],a.originals[key]);
    assert.doesNotMatch(a.node('outputDisplay').innerHTML,/ERROR: TypeError/);
  });
}
test('remote circular log still executes following statement and returns one response', () => {
  const a=createApp();a.remote('var cycle={};cycle.self=cycle;console.log(cycle);globalThis.afterLog=true;42');
  assert.equal(a.context.afterLog,true);assert.equal(a.sent.length,1);
  assert.equal(a.sent[0].data.UUID,'fixture-peer');assert.equal(a.sent[0].data.sendData.remoteDebug.type,'result');
  assert.match(a.sent[0].data.sendData.remoteDebug.result,/Return value: 42/);assert.doesNotMatch(a.sent[0].data.sendData.remoteDebug.result,/ERROR: TypeError/);
});
test('cyclic return value is a successful displayed result', () => {
  const a=createApp();a.remote('var cycle={};cycle.self=cycle;cycle');
  assert.match(a.sent[0].data.sendData.remoteDebug.result,/Return value:/);assert.doesNotMatch(a.sent[0].data.sendData.remoteDebug.result,/ERROR: TypeError/);
});
test('nested BigInt console argument preserves execution', () => {
  const a=createApp();a.local('console.log({count:1n});globalThis.afterLog=true;void 0');assert.equal(a.context.afterLog,true);assert.equal(a.calls.length,1);
});
test('symbol console argument preserves execution', () => {
  const a=createApp();a.local("console.log(Symbol('example'));globalThis.afterLog=true;void 0");assert.equal(a.context.afterLog,true);assert.equal(a.calls.length,1);
});
test('symbol return value is displayed without false execution error', () => {
  const a=createApp();a.remote("Symbol('example')");assert.match(a.sent[0].data.sendData.remoteDebug.result,/Return value: Symbol\(example\)/);assert.doesNotMatch(a.sent[0].data.sendData.remoteDebug.result,/ERROR: TypeError/);
});
test('throwing toJSON does not abort the program', () => {
  const a=createApp();a.local("console.log({toJSON(){throw new Error('fixture conversion')}});globalThis.afterLog=true;void 0");assert.equal(a.context.afterLog,true);assert.equal(a.calls.length,1);
});
test('throwing JSON and string conversion cannot prevent console forwarding', () => {
  const a=createApp();a.local("console.log({toJSON(){throw new Error('fixture JSON')},toString(){throw new Error('fixture string')}});globalThis.afterLog=true;void 0");assert.equal(a.context.afterLog,true);assert.equal(a.calls.length,1);
});
test('window-like self reference does not abort inspection', () => {
  const a=createApp();a.local('console.log(window);globalThis.afterLog=true;void 0');assert.equal(a.context.afterLog,true);assert.equal(a.calls.length,1);
});
test('normal JSON formatting, prefixes, return values and console identity remain', () => {
  const a=createApp();a.remote("console.log('hello',{value:2});console.warn('warning');console.error('problem');console.info('detail');6*7");
  const result=a.sent[0].data.sendData.remoteDebug.result;
  assert.equal(result,'hello {\n  "value": 2\n}\nWARN: warning\nERROR: problem\nINFO: detail\n\nReturn value: 42');
  assert.equal(a.calls.length,4);for(const key in a.originals)assert.equal(a.consoleDouble[key],a.originals[key]);
});
test('actual evaluation errors remain errors and restore original console', () => {
  const a=createApp();a.remote("console.log('before');throw new Error('expected failure')");
  assert.match(a.sent[0].data.sendData.remoteDebug.result,/before\n\nERROR: Error: expected failure/);assert.equal(a.calls.length,1);
  for(const key in a.originals)assert.equal(a.consoleDouble[key],a.originals[key]);
});
test('empty input does not execute code or touch console methods', () => {
  const a=createApp();a.local('  ');assert.equal(a.calls.length,0);assert.match(a.node('outputDisplay').innerHTML,/No code to execute/);for(const key in a.originals)assert.equal(a.consoleDouble[key],a.originals[key]);
});

test('undefined console argument retains existing blank output', () => {
  const a=createApp();a.remote('console.log(undefined);void 0');
  assert.equal(a.sent[0].data.sendData.remoteDebug.result,'\n');assert.equal(a.calls.length,1);assert.equal(a.calls[0].args[0],undefined);
});
