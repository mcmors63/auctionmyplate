"use client";

import React from "react";

type NumberPlateProps = {
  reg: string;
  variant?: "front" | "rear";
  size?: "standard" | "card" | "large";
  showBlueBand?: boolean;
  editable?: boolean; // 🔥 NEW (for Sell a Plate)
  onChange?: (v: string) => void; // 🔥 NEW
};

/** Format into DVLA style → AB12 CDE */
function formatDVLA(reg: string): string {
  let cleaned = reg.replace(/\s+/g, "").toUpperCase();

  // Insert the space after 4 characters for UK plates
  if (cleaned.length > 4) {
    cleaned = cleaned.slice(0, 4) + " " + cleaned.slice(4);
  }

  return cleaned;
}

export default function NumberPlate({
  reg,
  variant = "rear",
  size = "standard",
  showBlueBand = true,
  editable = false,   // 🔥 NEW
  onChange,           // 🔥 NEW
}: NumberPlateProps) {
  const formattedReg = formatDVLA(reg);

  // 🔥 Correct DVLA size ratios
  const sizeMap = {
    standard: { width: 350, height: 90, font: 46 },
    card:     { width: 240, height: 60, font: 30 },
    large:    { width: 420, height: 110, font: 55 },
  } as const;

  const { width, height, font } = sizeMap[size] ?? sizeMap.standard;

  const bgColour = variant === "rear" ? "bg-dvla-yellow" : "bg-white";

  return (
    <div className="flex items-center justify-center"
      style={{ width, height }}
    >
      <div
        className={`relative flex h-full w-full items-center justify-center border-[6px] border-black rounded-md overflow-hidden ${bgColour}`}
      >
        {/* Blue band (GB) */}
        {showBlueBand && (
          <div className="absolute left-0 top-0 h-full w-[20%] bg-dvla-blue flex items-center justify-center">
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
              paddingLeft: showBlueBand ? "22%" : "10%",
              paddingRight: "10%",
              fontSize: font,
              letterSpacing: "8px",
            }}
            onChange={(e) => {
              if (onChange) onChange(formatDVLA(e.target.value));
            }}
          />
        ) : (
          <span
            className="font-dvla text-black select-none uppercase"
            style={{
              paddingLeft: showBlueBand ? "22%" : "10%",
              paddingRight: "10%",
              fontSize: font,
              letterSpacing: "8px",
              whiteSpace: "nowrap",
            }}
          >
            {formattedReg}
          </span>
        )}
      </div>
    </div>
  );
}
