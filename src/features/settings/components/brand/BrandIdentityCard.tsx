interface Props {
  identity: { name: string; tagline: string; description: string };
  onUpdate: (updates: { name?: string; tagline?: string; description?: string }) => void;
}

export const BrandIdentityCard = ({ identity, onUpdate }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="text-base font-semibold text-foreground">Brand Identity</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Define your brand name, tagline, and core description.
      </p>
      <div className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground">Brand Name</label>
          <input
            type="text"
            value={identity.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Tagline</label>
          <input
            type="text"
            value={identity.tagline}
            onChange={(e) => onUpdate({ tagline: e.target.value })}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Company Description</label>
          <textarea
            rows={3}
            value={identity.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  );
};