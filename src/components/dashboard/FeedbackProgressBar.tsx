interface FeedbackProgressBarProps {
  current: number;
  target: number;
}

export function FeedbackProgressBar({
  current,
  target,
}: FeedbackProgressBarProps) {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Postęp personalizacji</span>
        <span className="font-medium">
          {current} / {target}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Dodaj jeszcze {target - current} feedbacków do aktywacji personalizacji
      </p>
    </div>
  );
}
