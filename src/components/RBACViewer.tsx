/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ShieldCheck, UserCheck, CheckCircle2, AlertOctagon } from "lucide-react";

interface RBACViewerProps {
  workspaceId: string;
}

interface WorkspaceMember {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  joinedAt: string;
}

export default function RBACViewer({ workspaceId }: RBACViewerProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/workspace?workspaceId=${workspaceId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.members) {
            setMembers(data.members);
          }
          if (data.currentUserRole) {
            setCurrentUserRole(data.currentUserRole);
          }
        }
      } catch (err) {
        console.error("Error loading workspace members:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [workspaceId]);

  const roleColors: Record<string, string> = {
    owner: "border-emerald-500 bg-emerald-950/20 text-emerald-400",
    admin: "border-amber-500 bg-amber-950/20 text-amber-400",
    manager: "border-indigo-500 bg-indigo-950/20 text-indigo-400",
    editor: "border-pink-500 bg-pink-950/20 text-pink-400",
    viewer: "border-gray-500 bg-gray-950/20 text-gray-400",
  };

  const roleDescriptions: Record<string, string> = {
    owner: "Full unrestricted workspace access. Owns subscriptions, billing, and has the authority to delete workspace.",
    admin: "Can manage most workspace assets including operations, user management, queue control, and store setups.",
    manager: "Handles daily product workflows, content lists, market intelligence, publishing plans, and generation operations.",
    editor: "Generates content, creates AI videos, normalized listings, and initiates social publisher queue runs.",
    viewer: "Read-only analytics and general metrics visibility.",
  };

  return (
    <div className="bg-[#12131a] rounded-2xl border border-gray-800/60 p-6 backdrop-blur-md">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="w-5 h-5 text-emerald-400" />
        <div>
          <h3 className="text-xl font-display font-semibold text-white tracking-tight">
            Workspace Role-Based Access Control
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Current user role and workspace member assignments
          </p>
        </div>
      </div>

      {currentUserRole && (
        <div className="p-4 rounded-xl bg-[#161722] border border-gray-800/60 mb-6">
          <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider font-semibold">
            Your Current Role
          </span>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              roleColors[currentUserRole] || "border-gray-500 bg-gray-950/20 text-gray-400"
            }`}>
              {currentUserRole.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            {roleDescriptions[currentUserRole] || "No description available."}
          </p>
        </div>
      )}

      <div className="mb-4">
        <span className="text-[10px] font-mono text-gray-400 font-bold block uppercase tracking-wider">
          Workspace Members ({members.length})
        </span>
      </div>

      {loading ? (
        <div className="h-20 bg-[#0c0d12] rounded animate-pulse" />
      ) : members.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-500 font-mono bg-[#0c0d12]/30 rounded-xl border border-gray-900">
          No member data available for this workspace.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800/40 bg-[#161722]/20">
          <table className="w-full text-left border-collapse font-sans text-xs text-gray-300">
            <thead>
              <tr className="bg-[#161722] border-b border-gray-800/60 text-gray-400 font-semibold tracking-wider text-[10px] select-none">
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 hidden md:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {members.map((member) => (
                <tr key={member.userId} className="hover:bg-[#161722]/30 transition-all">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-gray-500" />
                      <div>
                        <span className="font-medium text-white font-display block">{member.fullName}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{member.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${
                      member.role === "owner"
                        ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30"
                        : member.role === "admin"
                        ? "bg-amber-950/20 text-amber-400 border-amber-900/30"
                        : member.role === "manager"
                        ? "bg-indigo-950/20 text-indigo-400 border-indigo-900/30"
                        : member.role === "editor"
                        ? "bg-pink-950/20 text-pink-400 border-pink-900/30"
                        : "bg-gray-800 text-gray-400 border-gray-700/50"
                    }`}>
                      {member.role === "owner" ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <AlertOctagon className="w-3 h-3" />
                      )}
                      {member.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 hidden md:table-cell">
                    {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
