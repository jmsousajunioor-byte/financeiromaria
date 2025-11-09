interface RealisticCardProps {
  nickname: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'elo';
  last4?: string;
  holderName?: string;
  gradientStart?: string;
  gradientEnd?: string;
  accentColor?: string;
  expirationMonth?: number | null;
  expirationYear?: number | null;
}

const brandLogos: Record<RealisticCardProps['brand'], JSX.Element> = {
  visa: (
    <div className="text-white font-black text-xl tracking-[0.25em] drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]">
      VISA
    </div>
  ),
  mastercard: (
    <div className="flex items-center gap-2">
      <span className="inline-block h-8 w-8 rounded-full bg-[#eb001b] drop-shadow" />
      <span className="inline-block h-8 w-8 rounded-full bg-[#f79e1b] -ml-2 drop-shadow" />
    </div>
  ),
  amex: (
    <div className="px-3 py-1 rounded-md border border-white/30 text-white text-[0.6rem] font-bold tracking-[0.45em] drop-shadow">
      AMEX
    </div>
  ),
  elo: (
    <div className="flex items-center gap-1">
      <span className="inline-block h-5 w-5 rounded-full bg-[#f5dd04]" />
      <span className="inline-block h-5 w-5 rounded-full bg-[#009ddc] -ml-2" />
      <span className="inline-block h-5 w-5 rounded-full bg-[#e41c24] -ml-2" />
    </div>
  ),
};

const hexToRgb = (hex?: string) => {
  if (!hex) return { r: 255, g: 255, b: 255 };
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  if (Number.isNaN(bigint)) return { r: 255, g: 255, b: 255 };
  if (normalized.length === 3) {
    const r = (bigint >> 8) & 0xf;
    const g = (bigint >> 4) & 0xf;
    const b = bigint & 0xf;
    return {
      r: (r << 4) | r,
      g: (g << 4) | g,
      b: (b << 4) | b,
    };
  }
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const rgba = (hex?: string, alpha = 1) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const maskShort = (last4?: string) => `•••• ${last4 ?? '0000'}`;

const formatExpiration = (month?: number | null, year?: number | null) =>
  month && year ? `${String(month).padStart(2, '0')}/${String(year).slice(-2)}` : '--/--';

const RealisticCard = ({
  nickname,
  brand,
  last4,
  holderName,
  gradientStart,
  gradientEnd,
  accentColor,
  expirationMonth,
  expirationYear,
}: RealisticCardProps) => {
  const startColor = gradientStart || '#5b21b6';
  const endColor = gradientEnd || '#7c3aed';
  const accent = accentColor || endColor || '#facc15';
  const shortMasked = maskShort(last4);
  const expiry = formatExpiration(expirationMonth ?? undefined, expirationYear ?? undefined);

  return (
    <div className="perspective-1000">
      <div className="relative w-80 h-48 rounded-[28px] shadow-[0_25px_45px_rgba(0,0,0,0.45)] overflow-hidden transform transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_35px_60px_rgba(0,0,0,0.55)]">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${startColor}, ${endColor})` }}
        />
        <div
          className="absolute inset-0 opacity-45 mix-blend-screen"
          style={{
            backgroundImage: `url('/card-metal.png')`,
            backgroundSize: 'cover',
            filter: 'contrast(1.05)',
          }}
        />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `
              radial-gradient(circle at 30% 30%, ${rgba(accent, 0.55)} 0%, transparent 45%),
              radial-gradient(circle at 80% 10%, ${rgba('#ffffff', 0.35)} 0%, transparent 35%),
              linear-gradient(120deg, ${rgba('#ffffff', 0.18)}, transparent 60%)
            `,
          }}
        />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background: `linear-gradient(150deg, transparent 40%, ${rgba('#000', 0.35)})`,
          }}
        />
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: `linear-gradient(45deg, ${rgba('#ffffff', 0.12)} 10%, transparent 10%, transparent 50%, ${rgba(
              '#ffffff',
              0.05,
            )} 50%, ${rgba('#ffffff', 0.05)} 60%, transparent 60%)`,
            backgroundSize: '8px 8px',
          }}
        />
        <div className="absolute inset-3 rounded-[24px] border border-white/20" />

        <div className="relative h-full p-6 text-white flex flex-col">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-3xl font-semibold tracking-wide">{nickname || 'Bank'}</p>
              <p className="text-xs uppercase tracking-[0.6em] text-white/60 mt-1">empresas</p>
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-[0.6rem] uppercase tracking-[0.4em] text-white/60">
              C6
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <p className="text-2xl font-semibold tracking-[0.35em]">{shortMasked}</p>
            <div className="mt-5 flex items-center justify-between text-xs text-white/60">
              <span>{holderName || 'Nome não informado'}</span>
              <span>{expiry}</span>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <div className="w-20 h-20 flex items-center justify-center">
              {brandLogos[brand]}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealisticCard;


