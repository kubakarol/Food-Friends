export function cn(...cl: (string | false | null | undefined)[]) {
  return cl.filter(Boolean).join(' ');
}

// usuwanie polskich znaków + lower
export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function debounce<T extends (...a: any[]) => void>(fn: T, ms = 200) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
