interface ProgressSegment {
  label: string;
  color: string;
  percentage: number;
}

interface SegmentedProgressBarProps {
  segments: ProgressSegment[];
}

export function SegmentedProgressBar({ segments }: SegmentedProgressBarProps) {
  return (
    <div className="w-full bg-muted h-2 overflow-hidden flex">
      {segments.map((segment, idx) => (
        <div
          key={idx}
          className={`h-full ${segment.color}`}
          style={{ width: `${segment.percentage}%` }}
        />
      ))}
    </div>
  );
}
