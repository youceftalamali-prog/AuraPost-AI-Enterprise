/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Database, AlertTriangle } from "lucide-react";

export default function DBViewer() {
  return (
    <div className="bg-[#12131a] rounded-2xl border border-gray-800/60 p-6 backdrop-blur-md">
      <div className="flex items-center gap-3 mb-4">
        <Database className="w-5 h-5 text-indigo-400" />
        <div>
          <h3 className="text-xl font-display font-semibold text-white tracking-tight">
            Database Viewer
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Direct database inspection for development and debugging
          </p>
        </div>
      </div>

      <div className="p-8 text-center rounded-xl border border-amber-900/30 bg-amber-950/10">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
        <p className="text-sm text-amber-300 font-semibold">
          Database viewer is available in development mode only.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Enable NODE_ENV=development to access direct database inspection tools.
        </p>
      </div>
    </div>
  );
}
