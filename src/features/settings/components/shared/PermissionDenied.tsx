import { ShieldAlert } from 'lucide-react';

export const PermissionDenied = () => {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-background p-12 text-center">
      <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold text-foreground">Access Denied</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        You do not have the required permissions to access this Developer module. 
        Please contact your workspace administrator if you believe this is an error.
      </p>
    </div>
  );
};