// app/place_bid/DvlaPlate.tsx
"use client";

type Props = {
  registration?: string | null;
};

export default function DvlaPlate({ registration }: Props) {
  // Normalise: remove spaces and force uppercase
  const raw = (registration || "").replace(/\s+/g, "").toUpperCase();

  // Insert a space after 4 characters (AB12 CDE)
  let formatted = raw;
  if (raw.length > 4) {
    formatted = raw.slice(0, 4) + " " + raw.slice(4);
  }

  const display = formatted || "AB12 CDE";

  return (
    <div
      className="
        flex items-center justify-center
        w-full max-w-md h-24
        bg-[#ffeb3b]
        border-[5px] border-black
        rounded-lg
        overflow-hidden
        shadow-[0_0_20px_rgba(0,0,0,0.7)]
      "
    >
      {/* Blue GB strip */}
      <div className="h-full w-12 bg-[#003399] flex items-center justify-center">
        <span className="text-xs font-bold text-white tracking-[0.15em]">
          GB
        </span>
      </div>

      {/* Registration text */}
      <div className="flex-1 flex items-center justify-center">
        <span
          className="
            font-black
            text-3xl sm:text-4xl
            tracking-[0.35em]
          "
        >
          {display}
        </span>
      </div>
    </div>
  );
}
