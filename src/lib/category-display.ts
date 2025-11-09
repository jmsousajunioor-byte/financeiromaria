import type { Database } from '@/integrations/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];

const DEFAULT_CATEGORY_MAP: Record<string, { name: string; icon: string; color: string }> = {
  alimentacao: { name: 'Alimentação', icon: '🍔', color: '#ef4444' },
  transporte: { name: 'Transporte', icon: '🚗', color: '#f59e0b' },
  moradia: { name: 'Moradia', icon: '🏠', color: '#8b5cf6' },
  saude: { name: 'Saúde', icon: '💊', color: '#ec4899' },
  educacao: { name: 'Educação', icon: '📚', color: '#3b82f6' },
  lazer: { name: 'Lazer', icon: '🎮', color: '#10b981' },
  compras: { name: 'Compras', icon: '🛍️', color: '#f97316' },
  outros: { name: 'Outros', icon: '📦', color: '#6b7280' },
  salario: { name: 'Salário', icon: '💼', color: '#0ea5e9' },
  investimento: { name: 'Investimento', icon: '📈', color: '#22c55e' },
};

const CATEGORY_ALIASES: Record<string, string> = {
  alimentao: 'alimentacao',
  alimentacaoo: 'alimentacao',
  moradia: 'moradia',
  sade: 'saude',
  educao: 'educacao',
  salrio: 'salario',
  investimento: 'investimento',
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/�/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
    .trim();

const sanitizeUnknown = (value: string) => value.replace(/\uFFFD/g, '').replace(/\?\?/g, '').trim();

const needsFix = (value: string | null | undefined) =>
  Boolean(value && (/[ÃÂðŸ�]/.test(value) || value.includes('??') || value.includes('\uFFFD')));

const decodeMojibake = (value: string): string => {
  try {
    // Attempt to interpret as ISO-8859-1 and convert to UTF-8
    const bytes = Uint8Array.from(value.split('').map((char) => char.charCodeAt(0)));
    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(bytes);
  } catch {
    return sanitizeUnknown(value);
  }
};

export const getCategoryDisplay = (category?: Category | null) => {
  if (!category) {
    return { name: 'Sem categoria', icon: '•', color: '#6b7280' };
  }

  const rawName = category.name ?? 'Categoria';
  const cleanedName = needsFix(rawName) ? decodeMojibake(rawName) : rawName;
  const baseKey = normalize(cleanedName);
  const normalizedKey = CATEGORY_ALIASES[baseKey] ?? baseKey;

  if (category.is_default && DEFAULT_CATEGORY_MAP[normalizedKey]) {
    return DEFAULT_CATEGORY_MAP[normalizedKey];
  }

  const rawIcon = category.icon ?? '';
  const cleanedIcon = needsFix(rawIcon) ? decodeMojibake(rawIcon) : rawIcon;

  return {
    name: cleanedName.trim() || 'Categoria',
    icon: cleanedIcon.trim() || '•',
    color: category.color ?? '#6b7280',
  };
};
