const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const main=fs.readFileSync(path.join(__dirname,'..','main.cjs'),'utf8');

test('diagnostic open keeps the popover visible for documentation capture',()=>{
  assert.match(main,/process\.argv\.includes\("--open"\)/);
  assert.match(main,/process\.env\.PTB_OPEN\s*===\s*"1"/);
  assert.match(main,/if \(!desktopCapabilities\.tray \|\| diagnosticOpen\) return;/);
});
