import { useEffect, useRef, useState } from 'react';
import { isToss } from '../lib/photos';
let ready: Promise<void> | undefined;
export default function BannerAd() {
  const target = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = import.meta.env.VITE_TOSS_BANNER_AD_GROUP_ID;
    if (!isToss || !id) return;
    let active = true;
    let slot: { destroy: () => void } | undefined;
    void (async () => {
      try {
        const { TossAds } = await import('@apps-in-toss/web-framework');
        if (!TossAds.initialize.isSupported() || !TossAds.attachBanner.isSupported()) return;
        ready ??= new Promise<void>((resolve, reject) => TossAds.initialize({ callbacks: { onInitialized: resolve, onInitializationFailed: reject } }));
        await ready;
        if (!active || !target.current) return;
        setVisible(true);
        slot = TossAds.attachBanner(id, target.current, { theme: 'light', tone: 'grey', variant: 'expanded', callbacks: {
          onNoFill: () => { if (active) setVisible(false); },
          onAdFailedToRender: () => { if (active) setVisible(false); },
          onAdRendered: () => { if (active) setVisible(true); },
        } });
      } catch { if (active) setVisible(false); }
    })();
    return () => { active = false; slot?.destroy(); };
  }, []);
  return <aside className="banner-ad" aria-label="광고" hidden={!visible}><small>광고</small><div ref={target} /></aside>;
}
