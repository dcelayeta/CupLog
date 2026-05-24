import Link from "next/link";
import { notFound } from "next/navigation";
import { getBagById } from "@/lib/bags/queries";
import FreshnessIndicator from "@/components/bags/FreshnessIndicator";
import BagActions from "@/components/bags/BagActions";

const ROAST_LABELS: Record<string, string> = {
  light: "Light",
  medium_light: "Medium Light",
  medium: "Medium",
  medium_dark: "Medium Dark",
  dark: "Dark",
  unspecified: "—",
};

const PROCESS_LABELS: Record<string, string> = {
  washed: "Washed",
  natural: "Natural",
  honey: "Honey",
  anaerobic: "Anaerobic",
  ea_washed: "EA Washed",
  swiss_water: "Swiss Water",
  other: "Other",
  unspecified: "—",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div
      className="flex items-center justify-between px-4 min-h-[52px]"
    >
      <span
        className="text-[17px]"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </span>
      <span
        className="text-[17px] text-right"
        style={{ color: "var(--text-secondary)" }}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="ml-4"
      style={{ height: "1px", backgroundColor: "var(--divider)" }}
    />
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p
      className="px-4 mb-2 text-[13px] font-medium uppercase tracking-wide"
      style={{ color: "var(--text-secondary)" }}
    >
      {label}
    </p>
  );
}

export default async function BagDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bag = await getBagById(Number(id));
  if (!bag) notFound();

  const infoRows = [
    { label: "Roaster", value: bag.roaster },
    { label: "Roast Level", value: ROAST_LABELS[bag.roastLevel] ?? "—" },
    {
      label: "Process",
      value: PROCESS_LABELS[bag.processingMethod] ?? "—",
    },
    { label: "Roast Date", value: bag.roastDate },
    { label: "Purchase Date", value: bag.purchaseDate ?? "" },
    { label: "Shop", value: bag.purchaseShop ?? "" },
    { label: "Price", value: bag.price ? `$${bag.price}` : "" },
    { label: "Weight", value: bag.weightG ? `${bag.weightG}g` : "" },
  ].filter((r) => r.value && r.value !== "—");

  return (
    <div className="pt-4 pb-8">
      {/* Nav header */}
      <div className="flex items-center justify-between px-4 mb-4">
        <Link
          href="/bags"
          className="flex items-center gap-1 text-[17px]"
          style={{ color: "var(--accent)" }}
        >
          <svg
            width="11"
            height="18"
            viewBox="0 0 11 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 1L1 9l8 8" />
          </svg>
          Bags
        </Link>
        <Link
          href={`/bags/${bag.id}/edit`}
          className="px-4 py-1.5 rounded-full text-[15px] font-medium"
          style={{
            backgroundColor: "var(--card-secondary)",
            color: "var(--text-primary)",
          }}
        >
          Edit
        </Link>
      </div>

      {/* Title */}
      <div className="px-4 mb-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {bag.isDecaf && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--card-secondary)",
                color: "var(--text-secondary)",
              }}
            >
              DECAF
            </span>
          )}
          {bag.isBlend && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--card-secondary)",
                color: "var(--text-secondary)",
              }}
            >
              BLEND
            </span>
          )}
        </div>
        <h1
          className="text-[34px] font-bold leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {bag.name}
        </h1>
        <p
          className="text-[17px] mt-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          {bag.roaster}
        </p>
        <div className="mt-2">
          {bag.status === "active" ? (
            <FreshnessIndicator roastDate={bag.roastDate} />
          ) : (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: "var(--text-secondary)" }}
              />
              <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                Finished{bag.finishedDate ? ` · ${bag.finishedDate}` : ""}
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 mt-6">
        {/* Info */}
        {infoRows.length > 0 && (
          <div>
            <SectionHeader label="Details" />
            <div
              className="mx-4 rounded-xl overflow-hidden"
              style={{
                backgroundColor: "var(--card)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              {infoRows.map((row, i) => (
                <div key={row.label}>
                  {i > 0 && <Divider />}
                  <InfoRow label={row.label} value={row.value} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Origins */}
        {bag.origins.length > 0 && (
          <div>
            <SectionHeader label={bag.origins.length > 1 ? "Origins" : "Origin"} />
            <div
              className="mx-4 rounded-xl overflow-hidden"
              style={{
                backgroundColor: "var(--card)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              {bag.origins.map((origin, i) => (
                <div key={origin.id}>
                  {i > 0 && <Divider />}
                  <div className="px-4 py-3">
                    <p
                      className="text-[17px] font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {origin.country}
                      {origin.region ? `, ${origin.region}` : ""}
                    </p>
                    {(origin.variety || origin.farm) && (
                      <p
                        className="text-[14px] mt-0.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {[origin.variety, origin.farm]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {origin.blendPercentage && (
                      <p
                        className="text-[14px]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {origin.blendPercentage}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shot count */}
        <div>
          <SectionHeader label="History" />
          <div
            className="mx-4 rounded-xl overflow-hidden"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <Link
              href={`/history?bagId=${bag.id}`}
              className="flex items-center justify-between px-4 min-h-[52px] active:opacity-70 transition-opacity"
            >
              <span
                className="text-[17px]"
                style={{ color: "var(--text-primary)" }}
              >
                Shots pulled
              </span>
              <span
                className="text-[17px] flex items-center gap-1"
                style={{ color: "var(--text-secondary)" }}
              >
                {bag.shotCount ?? 0}
                <svg
                  width="8"
                  height="13"
                  viewBox="0 0 8 13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 1l6 5.5L1 12" />
                </svg>
              </span>
            </Link>
          </div>
        </div>

        {/* Notes */}
        {bag.notes && (
          <div>
            <SectionHeader label="Notes" />
            <div
              className="mx-4 rounded-xl px-4 py-3"
              style={{
                backgroundColor: "var(--card)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <p
                className="text-[17px] leading-relaxed whitespace-pre-wrap"
                style={{ color: "var(--text-primary)" }}
              >
                {bag.notes}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        {bag.status !== "removed" && (
          <BagActions bagId={bag.id} status={bag.status} />
        )}
      </div>
    </div>
  );
}
