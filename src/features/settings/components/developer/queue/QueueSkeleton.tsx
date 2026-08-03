export const QueueSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 rounded-lg border border-border bg-muted/50" />
      ))}
    </div>
    <div className="h-96 rounded-lg border border-border bg-muted/50" />
  </div>
);