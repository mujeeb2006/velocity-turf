const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold tracking-wide " +
  "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  primary: "bg-sky-500 text-slate-950 hover:bg-sky-400",
  secondary: "bg-white/10 text-slate-100 hover:bg-white/15",
  outline: "border border-white/20 text-slate-200 hover:bg-white/5",
  ghost: "text-slate-300 hover:bg-white/5",
  danger: "bg-orange-500 text-slate-950 hover:bg-orange-400",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}