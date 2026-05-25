import type { Classification } from "@/lib/shots/classification";

export default function ClassificationBadge({
  classification,
  size = "md",
}: {
  classification: Classification;
  size?: "sm" | "md";
}) {
  const fontSize = size === "sm" ? 12 : 13;
  const paddingX = size === "sm" ? 8 : 10;
  const paddingY = size === "sm" ? 2 : 3;

  return (
    <span
      style={{
        display: "inline-block",
        backgroundColor: classification.color + "22",
        color: classification.color,
        fontSize,
        fontWeight: 600,
        borderRadius: 20,
        paddingLeft: paddingX,
        paddingRight: paddingX,
        paddingTop: paddingY,
        paddingBottom: paddingY,
        lineHeight: 1.3,
      }}
    >
      {classification.label}
    </span>
  );
}
