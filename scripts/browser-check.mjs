import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts', {recursive:true});
const browser = await chromium.launch({headless:true, channel:"chrome"});
try {
 const context = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1 });
 const page = await context.newPage(); const errors=[]; const ads=[];
 page.on('pageerror', error=>errors.push(error.message));
 page.on('request', request=>{if(/googlesyndication|doubleclick/.test(request.url())) ads.push(request.url());});
 await page.goto('http://127.0.0.1:5179/');
 await page.getByText('5회 남음',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
 await page.screenshot({path:'artifacts/mobile-home.png',fullPage:true});
 await page.getByRole('button',{name:'이용 안내',exact:true}).click();
 await page.getByText('한국 시간 자정에 이용 횟수가 새로 시작돼요.',{exact:false}).waitFor();
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 for(let i=0;i<5;i++){
  await page.locator('input[aria-label="앨범에서 식물 사진 선택"]').setInputFiles('public/flower-hero.webp');
  await page.getByRole('button',{name:'이 사진으로 무료 분석하기',exact:true}).click();
  await page.getByRole('heading',{name:'오늘 만난 식물',exact:true}).waitFor();
  if(i===0){
   await page.getByLabel('이 순간에 한마디',{exact:false}).fill('웹앱 동작 확인');
   await page.getByRole('button',{name:'나의 식물도감에 담기',exact:true}).click();
   await page.getByRole('button',{name:'식물도감에 담았어요',exact:true}).waitFor();
   await page.screenshot({path:'artifacts/mobile-result.png',fullPage:true});
  }
  await page.getByRole('button',{name:'닫기',exact:true}).click();
 }
 await page.getByText('0회 남음',{exact:true}).waitFor();
 await page.locator('input[aria-label="앨범에서 식물 사진 선택"]').setInputFiles('public/flower-hero.webp');
 await page.getByRole('button',{name:'이 사진으로 무료 분석하기',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'이 사진으로 무료 분석하기',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:'나의 식물도감',exact:false}).click();
 await page.getByText('코스모스 · 화면 체험용',{exact:false}).first().waitFor();
 await page.reload();
 await page.getByText('0회 남음',{exact:true}).waitFor();
 await page.getByRole('button',{name:'나의 식물도감',exact:false}).click();
 await page.getByText('코스모스 · 화면 체험용',{exact:false}).first().waitFor();
 for(const path of ['about','privacy','terms','contact']){const response=await page.goto(`http://127.0.0.1:5179/${path}.html`);assert.equal(response.status(),200);}
 assert.equal(ads.length,0); assert.deepEqual(errors,[]);
 console.log('PASS: mobile layout, five analyses, sixth blocked, card persisted after reload, policy pages, no ad requests, no browser errors (demo data only)');
} finally { await browser.close(); }


