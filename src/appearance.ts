import { normalizeTint } from './tint';

export const readingStyles = [
  { id: 'folio', name: 'SlayDown', description: 'Calm & spacious' },
  { id: 'code', name: 'VS Code', description: 'Compact & technical' },
  { id: 'writer', name: 'iA Writer', description: 'Classic serif' },
  { id: 'github', name: 'GitHub', description: 'Familiar & structured' },
  { id: 'omarchy', name: 'Omarchy', description: 'Block type & mono' },
] as const;
export interface Appearance {
  theme: 'light' | 'dark' | 'system';
  readingStyle: string;
  tint: string | null;
  fontSize: number;
}
export function normalizeAppearance(value: unknown, omarchy = false): Appearance {
  const item = (value && typeof value === 'object' ? value : {}) as Partial<Appearance>;
  return {
    theme: ['light', 'dark', 'system'].includes(item.theme!) ? item.theme! : 'system',
    readingStyle: readingStyles.some(style => style.id === item.readingStyle) ? item.readingStyle! : omarchy ? 'omarchy' : 'folio',
    tint: normalizeTint(item.tint),
    fontSize: Number.isFinite(item.fontSize) ? Math.max(14, Math.min(23, item.fontSize!)) : 17,
  };
}
