export function cn(...cl: (string | false | null | undefined)[]) {
  return cl.filter(Boolean).join(' ');
}

export function openMap({name,lat,lng,mapsUrl}:{name?:string;lat?:number;lng?:number;mapsUrl?:string;}) {
  if (mapsUrl) return window.open(mapsUrl, '_blank');
  const q = encodeURIComponent(name || 'Lokal');
  const ll = lat && lng ? `&ll=${lat},${lng}` : '';
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const url = isIOS ? `http://maps.apple.com/?q=${q}${ll}` : `https://maps.google.com/?q=${q}${ll}`;
  window.open(url, '_blank');
}
