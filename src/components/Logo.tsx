type Props = {
  size?: number;
  className?: string;
  animated?: boolean;
};

export default function Logo({ size = 32, className = '', animated = false }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animated ? 'animate-spiral-breathe' : ''} ${className}`}
      aria-hidden="true"
    >
      <path
        d="M16 16 Q16 14, 14 14 T10 14 Q10 18, 14 18 T22 18 Q22 10, 14 10 T6 10 Q6 22, 18 22 T30 22 Q30 6, 14 6"
        stroke="currentColor"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        opacity={0.85}
      />
    </svg>
  );
}
