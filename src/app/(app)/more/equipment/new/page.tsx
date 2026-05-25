import NewEquipmentFormClient from "@/components/equipment/NewEquipmentFormClient";
import Link from "next/link";

export default function NewEquipmentPage() {
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

      <h1 className="text-[34px] font-display px-4 mb-4" style={{ color: "var(--text-primary)" }}>
        New Profile
      </h1>

      <NewEquipmentFormClient />
    </div>
  );
}
