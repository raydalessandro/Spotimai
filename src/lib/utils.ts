export const gradientFor = (seed: string): string => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
  const hue1 = Math.abs(h) % 360;
  const hue2 = (hue1 + 40 + (Math.abs(h >> 8) % 60)) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 35%, 28%), hsl(${hue2}, 30%, 16%))`;
};

export const initials = (s: string): string =>
  s.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

export const fmtTime = (sec: number): string => {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};
