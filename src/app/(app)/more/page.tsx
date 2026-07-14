import Link from "next/link";
import { getActiveEquipmentProfile } from "@/lib/equipment/queries";
import ThemeSelector from "@/components/ThemeSelector";

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function NavRow({
  href,
  label,
  description,
  warning,
}: {
  href: string;
  label: string;
  description?: string;
  warning?: string;
}) {
  return (
    <Link
      href={href}
      className="row-divider flex items-center px-6 min-h-[52px] active:opacity-70 transition-opacity"
    >
      <div className="flex-1">
        <p className="text-[17px]" style={{ color: "var(--text-primary)" }}>{label}</p>
        {warning ? (
          <p className="text-[13px]" style={{ color: "var(--destructive)" }}>{warning}</p>
        ) : description ? (
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{description}</p>
        ) : null}
      </div>
      <svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 1l6 5.5L1 12" />
      </svg>
    </Link>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-6 pb-1">
      <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {title}
      </p>
    </div>
  );
}

export default async function MorePage() {
  const profile = await getActiveEquipmentProfile();

  const machineDays = profile ? daysSince(profile.machineLastCleanedAt) : null;
  const grinderDays = profile ? daysSince(profile.grinderLastCleanedAt) : null;
  const machineInterval = profile?.machineCleaningIntervalDays ?? 30;
  const grinderInterval = profile?.grinderCleaningIntervalDays ?? 14;

  const machineOverdue = machineDays === null || machineDays >= machineInterval;
  const grinderOverdue = grinderDays === null || grinderDays >= grinderInterval;

  const cleaningWarning = machineOverdue && grinderOverdue
    ? "Machine and grinder cleaning overdue"
    : machineOverdue
    ? "Machine cleaning overdue"
    : grinderOverdue
    ? "Grinder cleaning overdue"
    : undefined;

  return (
    <div className="pt-4 pb-24">
      <h1 className="text-[34px] font-display px-4 mb-4" style={{ color: "var(--text-primary)" }}>
        More
      </h1>

      <SectionHeader title="Knowledge" />
      <div
        className="mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
        <NavRow href="/more/faqs" label="My Coffee FAQs" description="Ask questions, get personalized answers" />
      </div>

      <SectionHeader title="Drinks" />
      <div
        className="mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
        <NavRow href="/more/drinks" label="Drink History" description="Browse all logged drinks" />
        <NavRow href="/more/recipes" label="Drink Reference" description="Espresso drink guide and proportions" />
        <NavRow href="/more/yield-calculator" label="Yield Calculator" description="Yields for standard ratios given a dose" />
      </div>

      <SectionHeader title="Appearance" />
      <div
        className="mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
        <ThemeSelector />
      </div>

      <SectionHeader title="Data" />
      <div
        className="mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
        <NavRow href="/api/export" label="Export Backup" description="Download all data as JSON" />
      </div>

      <SectionHeader title="Equipment" />
      <div
        className="mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
        <NavRow
          href="/more/equipment"
          label="Equipment Profile"
          warning={cleaningWarning}
          description={cleaningWarning ? undefined : "Machine, grinder, and defaults"}
        />
        <NavRow href="/more/thresholds" label="Extraction Thresholds" description="Time and ratio classification ranges" />
        <NavRow href="/more/coaching-state" label="AI Coaching State" description="Edit the AI coach's rolling context" />
      </div>

      <div className="mt-8 mb-2 flex flex-col items-center gap-0.5">
        <p className="text-[12px]" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>Yield v3.14</p>
        <p className="text-[12px]" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>© {new Date().getFullYear()} Diego Celayeta. All rights reserved.</p>
      </div>
    </div>
  );
}
