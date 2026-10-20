import { CapacitorHttp, Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

// Нативный HTTP через OkHttp на Android — CORS не применяется.
// В браузере падаем обратно на fetch (для dev-режима).
export async function httpGet(url: string, headers?: Record<string, string>): Promise<any> {
  if (isNative) {
    const res = await CapacitorHttp.get({ url, headers, responseType: 'json' });
    if (res.status >= 400) throw new Error(`HTTP ${res.status} ${url}`);
    return res.data;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

export async function httpGetText(url: string, headers?: Record<string, string>): Promise<string> {
  if (isNative) {
    const res = await CapacitorHttp.get({ url, headers, responseType: 'text' });
    if (res.status >= 400) throw new Error(`HTTP ${res.status} ${url}`);
    return res.data;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}
