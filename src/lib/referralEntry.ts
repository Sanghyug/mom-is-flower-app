const valid = (code: unknown): code is string => typeof code === 'string' && /^[A-Za-z0-9_-]{24}$/.test(code);
export function referralFromURL(value: string) {
  try { const code = new URL(value).searchParams.get('ref'); return valid(code) ? code : null; }
  catch { return null; }
}
let captured: Promise<string | null> | undefined;
export function entryReferralCode() {
  return captured ??= (async () => {
    let code = referralFromURL(window.location.href);
    if (import.meta.env.MODE === 'toss') {
      try { const { Environment } = await import('@apps-in-toss/web-framework'); code ??= referralFromURL(Environment.initialURL); }
      catch { /* A normal web entry can still supply the query parameter. */ }
    }
    try {
      const previous = JSON.parse(localStorage.getItem('plant-invite-entry') || 'null');
      if (valid(previous?.code) && Number(previous?.expiresAt) > Date.now()) return previous.code as string;
      if (code) localStorage.setItem('plant-invite-entry', JSON.stringify({code,expiresAt:Date.now()+7*86400000}));
    } catch { /* URL attribution remains available with storage blocked. */ }
    return code;
  })();
}
export async function referralShareURL(url: string) {
  if (import.meta.env.MODE !== 'toss') return url;
  try {
    const { Environment } = await import('@apps-in-toss/web-framework');
    const initial = new URL(Environment.initialURL);
    const id = initial.searchParams.get('_deploymentId');
    if (initial.protocol === 'intoss-private:' && id && /^[0-9a-f-]{36}$/.test(id)) {
      const test = new URL(url); test.searchParams.set('testDeploymentId', id); return test.href;
    }
  } catch { /* Production and ordinary web links do not need a test deployment. */ }
  return url;
}
