import { gradientFor, initials } from '../lib/utils';

type Props = {
  seed: string;
  label: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'md' | 'lg' | 'full';
  src?: string;
};

export default function Cover({ seed, label, size = 'md', rounded = 'md', src }: Props) {
  const sizes = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-full aspect-square text-3xl',
  };
  const rounds = { md: 'rounded-md', lg: 'rounded-lg', full: 'rounded-full' };

  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className={`${sizes[size]} ${rounds[rounded]} object-cover shrink-0 shadow-sm bg-zinc-900`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} ${rounds[rounded]} flex items-center justify-center font-mono font-semibold text-zinc-300 shrink-0 shadow-sm`}
      style={{ background: gradientFor(seed) }}
    >
      {initials(label)}
    </div>
  );
}
