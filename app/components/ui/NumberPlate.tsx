// app/components/ui/NumberPlate.tsx
"use client";

import React from "react";
import { formatDvlaRegistration } from "@/lib/formatDvlaRegistration";

type NumberPlateProps = {
  reg: string;
  variant?: "front" | "rear";
  size?: "standard" | "card" | "large";
  showBlueBand?: boolean;
  editable?: boolean;
  onChange?: (v: string) => void;
};

export default function NumberPlate({
  reg,
  variant = "rear",
  size = "standard",
  showBlueBand = true,
  editable = false,
  onChange,
}: NumberPlateProps) {
  // ✅ Single source of truth for spacing
  const formattedReg = formatDvlaRegistration(reg || "");

  const sizeMap = {
    standard: { width: 350, height: 90, font: 46 },
    card: { width: 240, height: 60, font: 30 },
    large: { width: 420, height: 110, font: 55 },
  } as const;

  const { width, height, font } = sizeMap[size] ?? sizeMap.standard;

  const bgColour = variant === "rear" ? "bg-dvla-yellow" : "bg-white";

  const paddingLeft = showBlueBand ? "26%" : "10%";
  const paddingRight = "10%";

  return (
    <div className="flex items-center justify-center" style={{ width, height }}>
      <div
        className={`relative flex h-full w-full items-center justify-center border-[6px] border-black rounded-md overflow-hidden ${bgColour}`}
      >
        {/* Blue band (UK) */}
        {showBlueBand && (
          <div className="absolute left-0 top-0 h-full w-[14%] bg-dvla-blue flex items-center justify-center">
            <span className="text-white font-bold text-sm -rotate-90 tracking-widest">
              UK
            </span>
          </div>
        )}

        {/* REG TEXT / INPUT */}
        {editable ? (
          <input
            value={formattedReg}
            maxLength={8}
            className="bg-transparent border-none outline-none font-dvla uppercase text-black text-center w-full"
            style={{
              paddingLeft,
              paddingRight,
              fontSize: font,
              letterSpacing: "8px",
            }}
            onChange={(e) => {
              const next = formatDvlaRegistration(e.target.value);
              if (onChange) onChange(next);
            }}
          />
        ) : (
          <span
            className="font-dvla text-black select-none uppercase"
            style={{
              paddingLeft,
              paddingRight,
              fontSize: font,
              letterSpacing: "8px",
              whiteSpace: "nowrap",
            }}
          >
            {formattedReg || "YOUR REG"}
          </span>
        )}
      </div>
    </div>
  );
}
