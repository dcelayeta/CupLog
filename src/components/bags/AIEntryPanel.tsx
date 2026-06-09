"use client";

import { useRef, useState } from "react";
import { parseBagWithAI, getDialInRecommendation } from "@/lib/bags/parseWithAI";
import type { ParsedBagData } from "@/lib/bags/parseWithAI";

export default function AIEntryPanel({
  onParsed,
  onTip,
  onTipLoading,
}: {
  onParsed: (data: ParsedBagData) => void;
  onTip?: (tip: string) => void;
  onTipLoading?: (loading: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedBagData | null>(null);
  const [isTipping, setIsTipping] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const [tipError, setTipError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Resize to max 1200px and re-encode as JPEG — handles HEIC conversion and keeps payload under server action limit
  const prepareImage = (file: File): Promise<File> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Canvas unavailable")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) { reject(new Error("Compression failed")); return; }
          const name = file.name.replace(/\.(heic|heif)$/i, ".jpg");
          resolve(new File([blob], name, { type: "image/jpeg" }));
        }, "image/jpeg", 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not load image")); };
      img.src = url;
    });

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setParsedData(null);
    setTip(null);
    setTipError(null);
    setText("");
    setImageFile(null);
  };

  const handleParse = async () => {
    setError(null);
    setIsParsing(true);

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;

      if (imageFile) {
        const buffer = await imageFile.arrayBuffer();
        imageBase64 = Buffer.from(buffer).toString("base64");
        imageMimeType = imageFile.type;
      }

      const result = await parseBagWithAI({
        text: text.trim() || undefined,
        imageBase64,
        imageMimeType,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onParsed(result.data);
      setParsedData(result.data);
      setTip(null);
      setTipError(null);

      // Auto-fetch dial-in tip right after parsing
      setIsTipping(true);
      onTipLoading?.(true);
      getDialInRecommendation(result.data).then((tipResult) => {
        setIsTipping(false);
        onTipLoading?.(false);
        if ("error" in tipResult) {
          setTipError(tipResult.error);
        } else {
          setTip(tipResult.tip);
          onTip?.(tipResult.tip);
        }
      });
    } finally {
      setIsParsing(false);
    }
  };

  const canParse = (text.trim().length > 0 || imageFile !== null) && !isParsing && !isConverting;

  if (!isOpen) {
    return (
      <div className="px-4 mb-2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full py-3.5 rounded-full text-[17px] font-medium flex items-center justify-center gap-2"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--accent)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 6v6l4 2" />
            <path d="M22 2 12 12" />
          </svg>
          Parse with AI
        </button>
      </div>
    );
  }

  // ── Parsed state ──────────────────────────────────────────────────────────
  if (parsedData) {
    const bagLabel = [parsedData.roaster, parsedData.name].filter(Boolean).join(" — ") || "Bag";
    return (
      <div className="px-4 mb-2">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
        >
          {/* Header */}
          <div className="row-divider flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="#34C759" strokeWidth="1.8" />
                <path d="M6 10l3 3 5-5" stroke="#34C759" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                Parsed
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-[15px] font-medium"
              style={{ color: "var(--accent)" }}
            >
              Done
            </button>
          </div>

          {/* Bag summary */}
          <div className="px-4 py-3 row-divider">
            <p className="text-[15px] font-medium" style={{ color: "var(--text-primary)" }}>
              {bagLabel}
            </p>
            {(parsedData.roastLevel && parsedData.roastLevel !== "unspecified" || parsedData.processingMethod && parsedData.processingMethod !== "unspecified") && (
              <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {[
                  parsedData.roastLevel !== "unspecified" ? parsedData.roastLevel?.replace("_", " ") : null,
                  parsedData.processingMethod !== "unspecified" ? parsedData.processingMethod?.replace(/_/g, " ") : null,
                ].filter(Boolean).join(" · ")}
              </p>
            )}
            {parsedData.origins?.length ? (
              <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {parsedData.origins.map((o) => [o.country, o.region].filter(Boolean).join(", ")).join(" / ")}
              </p>
            ) : null}
          </div>

          {/* Dial-in tip section */}
          {(isTipping || tip || tipError) && (
            <div className="px-4 py-3">
              {isTipping && (
                <p className="text-[14px] text-center py-1" style={{ color: "var(--text-secondary)" }}>
                  Generating dial-in tip…
                </p>
              )}
              {tipError && (
                <p className="text-[14px]" style={{ color: "var(--destructive)" }}>
                  {tipError}
                </p>
              )}
              {tip && (
                <div
                  className="rounded-xl px-4 py-3"
                  style={{ backgroundColor: "#AF52DE11", border: "1px solid #AF52DE33" }}
                >
                  <p className="text-[13px] font-semibold mb-1" style={{ color: "#AF52DE" }}>
                    Dial-in tip ✦
                  </p>
                  <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
                    {tip}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Input state ───────────────────────────────────────────────────────────
  return (
    <div className="px-4 mb-2">
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--card)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        }}
      >
        {/* Header */}
        <div
          className="row-divider flex items-center justify-between px-4 py-3"
        >
          <span
            className="text-[15px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Parse with AI
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="text-[15px]"
            style={{ color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
        </div>

        {/* Image upload */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="row-divider w-full flex items-center justify-between px-6 min-h-[52px] active:opacity-70 transition-opacity"
        >
          <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>
            Photo of bag
          </span>
          <span
            className="text-[15px] max-w-[160px] truncate"
            style={{ color: imageFile ? "var(--accent)" : "var(--text-secondary)" }}
          >
            {isConverting ? "Converting…" : imageFile ? imageFile.name : "Tap to upload"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0] ?? null;
              if (!file) { setImageFile(null); return; }
              setError(null);
              setIsConverting(true);
              try {
                const prepared = await prepareImage(file);
                setImageFile(prepared);
              } catch {
                setError("Couldn't process this photo — try a different image.");
                setImageFile(null);
              } finally {
                setIsConverting(false);
              }
            }}
          />
        </button>

        {/* Text paste */}
        <div className="px-6 py-3 row-divider">
          <p
            className="text-[13px] mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Paste a URL, description, tasting notes, or anything about the bag
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="https://metriccoffee.com/products/andale-market — or paste any description, notes, or text about the bag"
            rows={4}
            className="w-full bg-transparent outline-none text-[17px] resize-none placeholder:text-[var(--text-secondary)]"
            style={{ color: "var(--text-primary)" }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2">
            <p className="text-[14px]" style={{ color: "var(--destructive)" }}>
              {error}
            </p>
          </div>
        )}

        {/* Parse button */}
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={handleParse}
            disabled={!canParse}
            className="w-full py-3 rounded-full text-[17px] font-medium transition-opacity disabled:opacity-40"
            style={{
              backgroundColor: "var(--accent)",
              color: "#FFFFFF",
            }}
          >
            {isParsing ? "Parsing…" : "Parse"}
          </button>
        </div>
      </div>
    </div>
  );
}
