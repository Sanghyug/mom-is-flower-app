import { useEffect, useRef } from 'react';
import { adSenseConfig } from '../lib/ads';

const config = adSenseConfig(import.meta.env);
export default function BannerAd() {
  const slot = useRef<HTMLModElement>(null);
  useEffect(() => {
    const element = slot.current;
    if (!config.enabled || !element || element.dataset.requested) return;
    // One request per DOM slot, including React StrictMode effect replays.
    element.dataset.requested = 'true';
    let script = document.querySelector<HTMLScriptElement>('script[data-flower-adsense]');
    if (!script) {
      script = document.createElement('script'); script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.client}`;
      script.crossOrigin = 'anonymous'; script.dataset.flowerAdsense = 'true';
      document.head.append(script);
    }
    try { const ads = window as Window & { adsbygoogle?: object[] }; (ads.adsbygoogle ??= []).push({}); } catch { /* Ad blocking never prevents plant analysis. */ }
  }, []);
  if (!config.enabled) return null;
  return <aside className="banner-ad" aria-label="광고"><small>광고</small><ins ref={slot} className="adsbygoogle" style={{ display: 'block', minHeight: 100 }} data-ad-client={config.client} data-ad-slot={config.slot} data-ad-format="auto" data-full-width-responsive="true" /></aside>;
}
