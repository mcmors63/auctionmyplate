// app/place_bid/DvlaPlate.tsx
"use client";

import React from "react";
import NumberPlate from "@/components/ui/NumberPlate";
import { formatDvlaRegistration } from "@/lib/formatDvlaRegistration";

type Props = {
  registration?: string | null;
  size?: "standard" | "card" | "large";
};

export default function DvlaPlate({ registration, size = "standard" }: Props) {
  const displayReg = registration
    ? formatDvlaRegistration(registration)
    : "YOUR REG";

  return (
    <NumberPlate
      reg={displayReg}
      variant="rear"
      size={size}
      showBlueBand={true}
    />
  );
}
