"use client";
import { useAuctionTimer } from "@/lib/useAuctionTimer";

export default function AuctionTimer({ endTime }: { endTime: string | number | null }) {
  const timeLeft = useAuctionTimer(endTime);

  if (!endTime) return <p className="text-red-500">⚠️ No end time set</p>;
  if (timeLeft <= 0) return <p className="text-gray-500">Auction ended</p>;

  const totalSeconds = Math.floor(timeLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="text-sm font-medium text-green-600">
      ⏰ {hours.toString().padStart(2, "0")}:
      {minutes.toString().padStart(2, "0")}:
      {seconds.toString().padStart(2, "0")}
    </div>
  );
}
