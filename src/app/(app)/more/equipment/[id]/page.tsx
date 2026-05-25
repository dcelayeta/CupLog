import { notFound } from "next/navigation";
import { getEquipmentProfileById, getActiveEquipmentProfile } from "@/lib/equipment/queries";
import EquipmentFormClient from "@/components/equipment/EquipmentFormClient";
import EquipmentCleaningClient from "@/components/equipment/EquipmentCleaningClient";
import Link from "next/link";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{title}</p>
    </div>
  );
}

export default async function EquipmentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getEquipmentProfileById(Number(id));
  if (!profile) notFound();

  return (
    <div className="pt-4 pb-24">
      <div className="px-4 mb-2">
        <Link href="/more/equipment" className="text-[17px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 1L1 8.5L9 16" />
          </svg>
          Equipment
        </Link>
      </div>

      <div className="px-4 mb-4 flex items-center gap-2">
        <h1 className="text-[34px] font-display flex-1" style={{ color: "var(--text-primary)" }}>
          {profile.name}
        </h1>
        {profile.isActive && (
          <span
            className="text-[13px] font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "var(--accent)" + "22", color: "var(--accent)" }}
          >
            Active
          </span>
        )}
      </div>

      <SectionHeader title="Cleaning" />
      <EquipmentCleaningClient profile={profile} />

      <SectionHeader title="Profile" />
      <EquipmentFormClient profile={profile} />
    </div>
  );
}
