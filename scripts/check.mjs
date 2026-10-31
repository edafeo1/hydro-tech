import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

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
  for(const image of imageTags){
    if(!/\balt="[^"]*"/.test(image))errors.push(`${page.url}: image without alt`);
    if(!/\bwidth="\d+"/.test(image)||!/\bheight="\d+"/.test(image))errors.push(`${page.url}: image without intrinsic dimensions`);
  }
  const policy=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1]||'';
  if(!policy.includes('object-src &#39;none&#39;')||!policy.includes('script-src &#39;self&#39;')||policy.includes('unsafe-inline'))errors.push(`${page.url}: weak or missing content security policy`);
  if(/\bon\w+\s*=|\bstyle="/i.test(html))errors.push(`${page.url}: inline event/style bypasses CSP`);
  if(!/\/assets\/app\.[a-f0-9]{12}\.js/.test(html)||!/\/assets\/site\.[a-f0-9]{12}\.css/.test(html))errors.push(`${page.url}: unversioned application assets`);
  if(page.url==='/404.html'&&!html.includes('noindex,follow'))errors.push('404 must never be indexed');
  for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
    try{
      const graph=JSON.parse(match[1])['@graph'];
      if(!Array.isArray(graph)||!graph.some(x=>x['@type']==='HomeAndConstructionBusiness'))errors.push(`${page.url}: missing business schema`);
      if(page.url.startsWith('/services/')&&page.url!=='/services/'&&!graph.some(x=>x['@type']==='Service'))errors.push(`${page.url}: missing service schema`);
    }catch{errors.push(`${page.url}: invalid JSON-LD`);}
    const hash=createHash('sha256').update(match[1]).digest('base64');
    if(!policy.includes(`sha256-${hash}`))errors.push(`${page.url}: inline structured data hash is not allowed by CSP`);
  }
  for(const source of html.matchAll(/\bsrcset="([^"]+)"/g))for(const entry of source[1].split(',')){
    const [url,width]=entry.trim().split(/\s+/);
    if(!/^\d+w$/.test(width||''))errors.push(`${page.url}: invalid responsive image width`);
    try{await fs.access(localPath(url));}catch{errors.push(`${page.url}: missing responsive image ${url}`);}
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
const imageManifest=JSON.parse(await fs.readFile(path.join(root,'src/image-manifest.json'),'utf8'));
for(const [name,info] of Object.entries(imageManifest)){
  const original=await fs.readFile(path.join(root,'public/assets',name));
  if(createHash('sha256').update(original).digest('hex')!==info.sourceSha256)errors.push(`${name}: regenerate image variants after changing the source`);
  for(const variant of info.variants){
    const data=await fs.readFile(path.join(dist,'assets',variant.name));
    if(data.subarray(8,12).toString()!=='WEBP'||data.length!==variant.bytes)errors.push(`${variant.name}: invalid or stale WebP`);
  }
}
const ads=JSON.parse(await fs.readFile(path.join(root,'marketing/google-search-draft.json'),'utf8'));
if(ads.campaign.status!=='PAUSED'||ads.campaign.dailyBudgetAUD!==null||ads.createdInGoogleAds!==false)errors.push('Advertising draft must remain paused without an approved budget');
for(const group of ads.campaign.adGroups){
  if(group.status!=='PAUSED'||group.responsiveSearchAd.status!=='PAUSED')errors.push('Ad assets must remain paused');
  if(!manifest.some(p=>new URL(group.finalUrl).pathname===p.url))errors.push(`Missing ad landing page: ${group.finalUrl}`);
  for(const headline of group.responsiveSearchAd.headlines)if(headline.length>30)errors.push(`Ad headline exceeds 30 characters: ${headline}`);
  for(const description of group.responsiveSearchAd.descriptions)if(description.length>90)errors.push(`Ad description exceeds 90 characters: ${description}`);
}
const enquiryTemplate=JSON.parse(await fs.readFile(path.join(root,'infrastructure/aws-enquiries.json'),'utf8'));
for(const resource of Object.values(enquiryTemplate.Resources).filter(r=>r.Type==='AWS::SQS::QueuePolicy')) {
  if(resource.Properties.Queues.length!==1||resource.Properties.PolicyDocument.Statement.some(s=>Array.isArray(s.Resource)))errors.push('Each SQS resource policy must target its own single queue');
}
for(const statement of enquiryTemplate.Resources.AlertTopicPolicy.Properties.PolicyDocument.Statement){
  const actions=Array.isArray(statement.Action)?statement.Action:[statement.Action];
  if(actions.some(action=>action.includes('*')))errors.push('SNS resource policy requires explicit supported actions');
}
const hosting=await fs.readFile(path.join(root,'infrastructure/aws-static-site.yml'),'utf8');
for(const expected of ['FrameOption: DENY',"frame-ancestors 'none'",'Permissions-Policy','X-Robots-Tag'])if(!hosting.includes(expected))errors.push(`Missing edge security header: ${expected}`);
for(const file of ['src/app.js','scripts/build.mjs','backend/enquiry.py','backend/delivery.py']){
  const code=await fs.readFile(path.join(root,file),'utf8');
  if(/(?:AKIA|ASIA)[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(code))errors.push(`Potential credential in ${file}`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Passed: ${manifest.length} pages, ${links} local links/assets, ${images} images, responsive assets, document anchors, structured data/CSP hashes, edge security headers, JavaScript syntax, PDF and paused ad drafts.`);
