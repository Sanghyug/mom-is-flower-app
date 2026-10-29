import { getAppShareLink } from '../lib/appLink';
import { useState } from 'react';
import { creditRequest, demoCredits } from '../lib/creditClient';
import { isToss } from '../lib/photos';
type Link = {token:string;url:string;expiresAt:number};
export default function CardLinkShare({cardId,name,meaning,memo,createdAt,getImage,beforeCreate,notify}:{cardId:string;name:string;meaning:string;memo:string;createdAt:string;getImage:()=>Promise<string>;beforeCreate:()=>Promise<void>;notify:(text:string)=>void}) {
  const key=`plant-card-link:${cardId}`;
  const [open,setOpen]=useState(false);
  const [link,setLink]=useState<Link|null>(()=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value.token==='string'&&typeof value.url==='string'&&typeof value.expiresAt==='number'&&value.expiresAt>Date.now()?value:null;}catch{return null;}});
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  async function create() {
    setBusy(true);setError('');
    try {
      await beforeCreate();
      const result=await creditRequest('share-card',{action:'create',card:{image:await getImage(),name,language:meaning,memo,createdAt}});
      if(typeof result.token!=='string'||typeof result.url!=='string'||typeof result.expiresAt!=='number')throw new Error('공유 링크를 확인하지 못했어요.');
      const next=result as Link;setLink(next);
      try{localStorage.setItem(key,JSON.stringify(next));}catch{setError('이 기기에 링크를 보관하지 못했어요. 공유 중단을 위해 이 화면을 유지해 주세요.');}
    }catch(e){setError(e instanceof Error?e.message:'공유 링크를 만들지 못했어요.');}finally{setBusy(false);}
  }
  async function send(copy=false) {
    if(!link)return;
    try {
      const appUrl = await getAppShareLink();
      const message = `${name} · 나의 식물카드를 함께 보세요.\n${link.url}\n\n토스에서 엄마는꽃 만나기\n${appUrl}`;
      if(copy){await navigator.clipboard.writeText(message);notify('식물카드 링크를 복사했어요.');}
      else if(isToss){const {share}=await import('@apps-in-toss/web-framework');await share({message});}
      else if(navigator.share)await navigator.share({title:`${name} · 엄마는꽃`,text:message});
      else{await navigator.clipboard.writeText(message);notify('식물카드 링크를 복사했어요.');}
    }catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setError('공유 창을 열지 못했어요. 링크 복사를 이용해 주세요.');}
  }
  async function revoke() {
    if(!link)return;setBusy(true);setError('');
    try {await creditRequest('share-card',{action:'revoke',token:link.token});setLink(null);try{localStorage.removeItem(key);}catch{/* Server revocation succeeded. */}notify('이 카드의 링크 공유를 중단했어요.');}
    catch(e){setError(e instanceof Error?e.message:'공유를 중단하지 못했어요.');}finally{setBusy(false);}
  }
  return <section className="card-link-share" aria-label="식물카드 링크 공유"><button className="button button-secondary" onClick={()=>setOpen(!open)} aria-expanded={open}>식물카드 링크로 공유하기</button>{open&&<div className="card-link-panel">
    <h3>이 카드 한 장만 함께 볼까요?</h3><p>먼저 카드를 나의 도감에 보관하고, 사진·이름·꽃말·메모가 포함된 공유용 복사본을 저장해요. 링크를 가진 사람은 로그인 없이 볼 수 있어요. 나머지 도감은 공유하지 않아요.</p><p>링크는 30일 후 만료돼요. 공유를 중단해도 이미 저장되거나 전달된 사진은 회수할 수 없어요. 추가 AI 호출과 돋보기 소모는 없어요.</p>
    {demoCredits?<p className="storage-note">체험 모드에서는 사진을 업로드하거나 실제 공개 링크를 만들지 않아요.</p>:link?<><p className="storage-note">{new Date(link.expiresAt).toLocaleDateString('ko-KR')}까지 볼 수 있는 카드예요. 카드 내용을 바꿨다면 기존 공유를 중단한 뒤 새 링크를 만들어 주세요.</p><div className="button-pair"><button className="button button-primary" disabled={busy} onClick={()=>void send()}>링크 공유하기</button><button className="button button-secondary" disabled={busy} onClick={()=>void send(true)}>링크 복사</button></div><button className="button button-text" disabled={busy} onClick={()=>void revoke()}>이 링크의 공유 중단</button></>:<button className="button button-primary" disabled={busy} onClick={()=>void create()}>{busy?'링크를 준비하고 있어요':'동의하고 공유 링크 만들기'}</button>}
    {error&&<p role="alert" className="inline-error">{error}</p>}
  </div>}</section>;
}
