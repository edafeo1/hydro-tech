import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const dist=path.join(root,'dist');
const manifest=JSON.parse(await fs.readFile(path.join(root,'page-manifest.json'),'utf8'));
const errors=[];
let links=0,images=0;
const contents=new Map();
const localPath=url=>path.join(dist,url.endsWith('/')?`${url.slice(1)}index.html`:url.slice(1));
for(const page of manifest){
  const file=localPath(page.url);
  const html=await fs.readFile(file,'utf8');
  contents.set(page.url,html);
  if((html.match(/<h1[ >]/g)||[]).length!==1)errors.push(`${page.url}: expected one h1`);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  if(ids.length!==new Set(ids).size)errors.push(`${page.url}: duplicate IDs`);
  if(!html.includes('name="description"'))errors.push(`${page.url}: no description`);
  if(!html.includes('rel="canonical"'))errors.push(`${page.url}: no canonical`);
  const imageTags=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
  images+=imageTags.length;
  for(const image of imageTags)if(!/\balt="[^"]*"/.test(image))errors.push(`${page.url}: image without alt`);
  for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
    try{JSON.parse(match[1]);}catch{errors.push(`${page.url}: invalid JSON-LD`);}
  }
}
for(const [page,html]of contents){
  for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
    const value=match[1].replaceAll('&amp;','&');
    if(/^(?:https?:|tel:|mailto:|data:)/i.test(value))continue;
    const url=new URL(value,`https://local.test${page}`);
    const file=localPath(decodeURIComponent(url.pathname));
    links++;
    try{const stat=await fs.stat(file);if(!stat.isFile()||stat.size===0)errors.push(`${page}: empty or invalid ${value}`);}catch{errors.push(`${page}: missing ${value}`);continue;}
    if(url.hash&&url.pathname.endsWith('/')){
      const target=contents.get(url.pathname)||await fs.readFile(file,'utf8');
      if(!target.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`))errors.push(`${page}: missing fragment ${value}`);
    }
  }
}
const js=path.join(root,'src','app.js');
execFileSync(process.execPath,['--check',js],{stdio:'pipe'});
const titleSet=new Set(manifest.map(page=>page.title));
if(titleSet.size!==manifest.length)errors.push('Page titles are not unique');
const pdf=await fs.readFile(path.join(dist,'assets','hydro-tec-capability-statement.pdf'));
if(pdf.subarray(0,5).toString()!=='%PDF-')errors.push('Capability statement is not a PDF');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Passed: ${manifest.length} pages, ${links} local links/assets, ${images} image tags, unique titles and IDs, document anchors, JSON-LD, JavaScript syntax and capability PDF.`);
