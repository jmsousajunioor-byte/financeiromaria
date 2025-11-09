export type CardColorPreset = {
  id: string;
  label: string;
  bank?: string;
  gradientStart: string;
  gradientEnd: string;
  accent: string;
  description?: string;
};

export const CARD_COLOR_PRESETS: CardColorPreset[] = [
  {
    id: 'nubank',
    label: 'Nubank Roxo',
    bank: 'Nubank',
    gradientStart: '#5f17c5',
    gradientEnd: '#a854ff',
    accent: '#f4c95d',
    description: 'Roxo oficial com brilho dourado',
  },
  {
    id: 'santander',
    label: 'Santander Vermelho',
    bank: 'Santander',
    gradientStart: '#c7141a',
    gradientEnd: '#ff4b2b',
    accent: '#ffe4d5',
  },
  {
    id: 'itau',
    label: 'Itaú Laranja',
    bank: 'Itaú',
    gradientStart: '#f18a00',
    gradientEnd: '#ffb347',
    accent: '#123d8d',
  },
  {
    id: 'bb',
    label: 'Banco do Brasil',
    bank: 'Banco do Brasil',
    gradientStart: '#0052a3',
    gradientEnd: '#00a2ff',
    accent: '#ffd200',
  },
  {
    id: 'caixa',
    label: 'Caixa Azul',
    bank: 'Caixa',
    gradientStart: '#005aae',
    gradientEnd: '#0085ff',
    accent: '#fdb812',
  },
  {
    id: 'bradesco',
    label: 'Bradesco Ruby',
    bank: 'Bradesco',
    gradientStart: '#b00045',
    gradientEnd: '#ff3d7f',
    accent: '#ffdce5',
  },
  {
    id: 'inter',
    label: 'Banco Inter',
    bank: 'Inter',
    gradientStart: '#ff6f00',
    gradientEnd: '#ff944d',
    accent: '#fff3e6',
  },
  {
    id: 'neon',
    label: 'Neon Ciano',
    bank: 'Neon',
    gradientStart: '#00a4ff',
    gradientEnd: '#01f7ff',
    accent: '#ffffff',
  },
  {
    id: 'custom-midnight',
    label: 'Midnight Wave',
    gradientStart: '#1f1c2c',
    gradientEnd: '#928dab',
    accent: '#c3aed6',
    description: 'Gradiente premium roxo',
  },
  {
    id: 'custom-carbon',
    label: 'Carbono Azul',
    gradientStart: '#0f2027',
    gradientEnd: '#203a43',
    accent: '#64b5f6',
  },
];

export const getPresetById = (id: string) =>
  CARD_COLOR_PRESETS.find((preset) => preset.id === id);
