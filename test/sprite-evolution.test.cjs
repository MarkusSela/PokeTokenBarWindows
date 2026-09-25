const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const { PokeApi }=require('../core/pokeapi.cjs');
const { resolveSpriteCandidates }=require('../core/sprite-resolver.cjs');
const { loadShippedCatalogDocument }=require('../core/pokeapi.cjs');
const main=fs.readFileSync(path.join(__dirname,'..','main.cjs'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

test('modern catalog line 56 keeps its post-Gen 5 evolution',async()=>{
  const api=new PokeApi(path.join(__dirname,'..','assets','.test-cache'));
  const line=await api.line(56);
  assert.equal(line.pathOptions.some(p=>p.includes(979)),true);
});

test('shiny sprites come from the verified catalog candidates',()=>{
  const catalog=loadShippedCatalogDocument();
  const candidates=resolveSpriteCandidates({speciesId:25,shiny:true,style:'auto',offline:false},catalog);
  assert.ok(candidates.length>0);
  assert.ok(candidates.every(candidate=>candidate.shiny===true));
  assert.match(candidates[0].src,/shiny/i);
  assert.doesNotMatch(html,/raw\.githubusercontent\.com\/PokeAPI\/sprites|generation-v/);
  assert.doesNotMatch(main,/raw\.githubusercontent\.com\/PokeAPI\/sprites|generation-v/);
});
