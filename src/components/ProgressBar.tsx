interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
}

export function ProgressBar({ value, className = "" }: ProgressBarProps) {
  // Ensure value is between 0 and 100
  const progress = Math.min(Math.max(0, value), 100);
  
  return (
    <div className={`h-1 w-full rounded-full bg-slate-200 ${className}`}>
      <div
        className="h-1 rounded-full bg-brand transition-all duration-300 ease-in-out"
        style={{ width: `${progress}%` }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      ></div>
    </div>
  );
}
