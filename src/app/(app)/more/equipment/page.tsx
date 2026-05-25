import { getEquipmentProfiles } from "@/lib/equipment/queries";
import EquipmentProfileListClient from "@/components/equipment/EquipmentProfileListClient";
import Link from "next/link";

export default async function EquipmentPage() {
  const profiles = await getEquipmentProfiles();

  return (
    <div className="pt-4 pb-24">
      <div className="px-4 mb-2 flex items-center justify-between">
        <Link href="/more" className="text-[17px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 1L1 8.5L9 16" />
          </svg>
          More
        </Link>
        <Link href="/more/equipment/new" className="text-[17px] font-medium" style={{ color: "var(--accent)" }}>
          Add
        </Link>
      </div>

      <h1 className="text-[34px] font-display px-4 mb-4" style={{ color: "var(--text-primary)" }}>
        Equipment
      </h1>

      {profiles.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-[17px]" style={{ color: "var(--text-secondary)" }}>No profiles yet</p>
          <Link href="/more/equipment/new" className="text-[17px] font-medium mt-2 block" style={{ color: "var(--accent)" }}>
            Add your first profile
          </Link>
        </div>
      ) : (
        <EquipmentProfileListClient profiles={profiles} />
      )}
    </div>
  );
}
