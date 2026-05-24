"use client";

import { useRef, useState } from "react";
import { parseBagWithAI } from "@/lib/bags/parseWithAI";
import type { ParsedBagData } from "@/lib/bags/parseWithAI";

export default function AIEntryPanel({
  onParsed,
}: {
  onParsed: (data: ParsedBagData) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      // Reset panel
      setText("");
      setImageFile(null);
      setIsOpen(false);
    } finally {
      setIsParsing(false);
    }
  };

  const canParse = (text.trim().length > 0 || imageFile !== null) && !isParsing;

  if (!isOpen) {
    return (
      <div className="px-4 mb-2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full py-3.5 rounded-xl text-[17px] font-medium flex items-center justify-center gap-2"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--accent)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
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

  return (
    <div className="px-4 mb-2">
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--card)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--divider)" }}
        >
          <span
            className="text-[15px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Parse with AI
          </span>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setError(null);
            }}
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
          className="w-full flex items-center justify-between px-4 min-h-[52px] active:opacity-70 transition-opacity"
          style={{ borderBottom: "1px solid var(--divider)" }}
        >
          <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>
            Photo of bag
          </span>
          <span
            className="text-[15px] max-w-[160px] truncate"
            style={{ color: imageFile ? "var(--accent)" : "var(--text-secondary)" }}
          >
            {imageFile ? imageFile.name : "Tap to upload"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
        </button>

        {/* Text paste */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--divider)" }}>
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
            className="w-full py-3 rounded-xl text-[17px] font-medium transition-opacity disabled:opacity-40"
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
