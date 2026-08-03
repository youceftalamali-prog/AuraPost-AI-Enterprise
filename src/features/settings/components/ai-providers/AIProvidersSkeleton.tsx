export const AIProvidersSkeleton = () => {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-3">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="h-4 w-96 rounded-md bg-muted" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-border bg-muted/50" />
        ))}
      </div>
    </div>
  );
};