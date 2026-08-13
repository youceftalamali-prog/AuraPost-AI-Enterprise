import { useEffect, useState } from 'react';
import { Database, ShieldCheck, Sparkles } from 'lucide-react';
import LoginCard from './components/LoginCard';
import { AgentFirstWorkspace } from './features/agent-shell/AgentFirstWorkspace';
import type { AuditLog, Session, User, Workspace } from './types';

function buildUser(
  email: string,
  fullName: string,
  role: string,
  workspaceId: string,
): User {
  return {
    id: '',
    email,
    full_name: fullName,
    role,
    active_workspace_id: workspaceId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export default function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetch('/api/workspace', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (!data?.user) return;
        const workspace = data.workspace || null;
        if (workspace) setWorkspaces([workspace]);
        setSession({
          accessToken: '',
          refreshToken: '',
          user: data.user,
          workspace,
        });
      })
      .catch(() => undefined);

    fetch('/api/health')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setTestMode(Boolean(data?.testMode)))
      .catch(() => setTestMode(false));
  }, []);

  const addAuditLog = (action: string, details: string) => {
    setAuditLogs((current) => [
      {
        id: crypto.randomUUID(),
        workspaceId:
          session?.workspace?.id ||
          session?.user.active_workspace_id ||
          'default-workspace',
        action,
        details,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
  };

  const createSession = (
    email: string,
    fullName: string,
    role: string,
    workspace: Workspace,
  ) => {
    setWorkspaces([workspace]);
    setSession({
      accessToken: '',
      refreshToken: '',
      user: buildUser(email, fullName, role, workspace.id),
      workspace,
    });
  };

  const handleLoginSuccess = (
    email: string,
    fullName: string,
    workspaceId: string,
    role: string,
  ) => {
    const workspace =
      workspaces.find((item) => item.id === workspaceId) ||
      ({ id: workspaceId || 'default-workspace', name: 'My workspace', credits: 0 } satisfies Workspace);
    createSession(email, fullName, role, workspace);
  };

  const handleRegisterSuccess = (
    email: string,
    fullName: string,
    workspaceName: string,
    role: string,
  ) => {
    createSession(email, fullName, role, {
      id: 'default-workspace',
      name: workspaceName,
      credits: 0,
    });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    } catch {
      // Local logout must still complete when the server is unavailable.
    }
    setSession(null);
  };

  if (session) {
    return (
      <AgentFirstWorkspace
        session={session}
        testMode={testMode}
        onLogout={handleLogout}
        onAddAuditLog={addAuditLog}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090b12] text-slate-100">
      <header className="border-b border-white/10 bg-[#090b12]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 p-2">
              <Sparkles className="h-5 w-5 text-white" />
            </span>
            <div>
              <strong className="block text-sm text-white">AuraPost AI</strong>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Agent-first commerce studio</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" /> V1 secure scope
          </span>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-8">
        <section className="space-y-7 lg:col-span-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs font-semibold text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" /> One agent. One workflow. Complete campaigns.
          </span>
          <div>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-6xl">
              From product link to campaign assets with Aura.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-400">
              Import a product, analyze its markets, choose a professional template, and create images and videos from one guided workspace.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <Database className="h-5 w-5 text-indigo-300" />
              <h2 className="mt-3 font-semibold text-white">Product intelligence</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">Import and analyze real product data before generating content.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <h2 className="mt-3 font-semibold text-white">Focused V1</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">Publishing, social connections, smart repost, and paid ads remain disabled.</p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-5">
          <LoginCard
            workspaces={workspaces}
            onLoginSuccess={handleLoginSuccess}
            onRegisterSuccess={handleRegisterSuccess}
            onAddAuditLog={addAuditLog}
          />
        </section>
      </main>

      <span className="sr-only">{auditLogs.length} local audit events</span>
    </div>
  );
}
