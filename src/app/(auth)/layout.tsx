import Link from "next/link";
import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

const startupSignals = [
  { label: "Uptime target", value: "99.99%" },
  { label: "Median reply feel", value: "<250ms" },
  { label: "Onboarding time", value: "~2 min" },
];

const trustPoints = [
  "Private conversations with startup-grade velocity",
  "Built for operators, founders, and AI-native teams",
  "Device linking, mobile-first login, and premium shell polish",
];

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(108,99,255,0.16),transparent_40%),linear-gradient(180deg,#030712,#020617_45%,#01030a)]">
      <div className="hidden min-w-0 flex-1 border-r border-white/10 lg:flex">
        <div className="flex w-full flex-col justify-between p-8 xl:p-10">
          <div className="space-y-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white/80"
            >
              Tepla
              <span className="text-sky-300">Startup Edition</span>
            </Link>

            <div className="max-w-xl">
              <h1 className="text-4xl font-semibold tracking-tight text-white xl:text-5xl">
                Messaging for teams that ship like a startup.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300 xl:text-base">
                Tepla combines secure communication, AI-native workflows, and a premium
                operator experience so the product feels convincing before the first demo
                even starts.
              </p>
            </div>

            <div className="grid max-w-xl grid-cols-3 gap-3">
              {startupSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-4"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    {signal.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">{signal.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-xl space-y-3 rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-300">
              Why teams switch
            </p>
            <div className="space-y-3">
              {trustPoints.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-sky-300" />
                  <p className="text-sm text-slate-300">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-4 py-6 sm:px-6 lg:w-[520px] lg:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
