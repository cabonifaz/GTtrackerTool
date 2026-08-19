const TONOS = {
  success: "bg-[var(--success-100)] text-[var(--success-ink)]",
  warning: "bg-[var(--warning-100)] text-[var(--warning-ink)]",
  danger: "bg-[var(--danger-100)] text-[var(--danger-ink)]",
  neutral: "bg-gray-100 text-gray-600",
} as const;

export default function Badge({
  tono = "neutral",
  children,
}: {
  tono?: keyof typeof TONOS;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONOS[tono]}`}>
      {children}
    </span>
  );
}
