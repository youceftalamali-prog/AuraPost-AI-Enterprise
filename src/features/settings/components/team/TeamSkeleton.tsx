export const TeamSkeleton = () => {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-3">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="h-4 w-96 rounded-md bg-muted" />
      </div>
      
      <div className="flex items-center gap-4">
        <div className="h-10 flex-1 rounded-md bg-muted" />
        <div className="h-10 w-32 rounded-md bg-muted" />
        <div className="h-10 w-32 rounded-md bg-muted" />
      </div>

      <div className="rounded-lg border border-border bg-muted/50">
        <div className="border-b border-border p-4">
          <div className="h-4 w-full rounded bg-muted" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-muted" />
              <div className="h-3 w-32 rounded bg-muted" />
            </div>
            <div className="h-8 w-24 rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
};