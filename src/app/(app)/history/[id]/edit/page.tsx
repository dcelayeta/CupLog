import { notFound } from "next/navigation";
import Link from "next/link";
import { getShotById, getActiveBags } from "@/lib/shots/queries";
import { updateShot } from "@/lib/shots/actions";
import ShotEditFormClient from "@/components/shots/ShotEditFormClient";

export default async function EditShotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [shot, bags] = await Promise.all([
    getShotById(Number(id)),
    getActiveBags(),
  ]);
  if (!shot) notFound();

  const action = updateShot.bind(null, shot.id);

  return (
    <div className="pt-4">
      <div className="px-4 mb-2">
        <Link href={`/history/${id}`} className="text-[17px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 1L1 8.5L9 16" />
          </svg>
          Shot
        </Link>
      </div>
      <h1 className="text-[34px] font-display px-4 mb-2" style={{ color: "var(--text-primary)" }}>
        Edit Shot
      </h1>
      <ShotEditFormClient shot={shot} bags={bags} action={action} />
    </div>
  );
}
