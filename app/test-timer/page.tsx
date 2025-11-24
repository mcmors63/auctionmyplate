import AuctionTimer from "../current-listings/AuctionTimer";

export default function TestTimerPage() {
  // Example: auction ends 1 minute from now
  const oneMinuteFromNow = new Date(Date.now() + 60 * 1000).toISOString();

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Test Auction Timer</h1>
      <AuctionTimer endTime={oneMinuteFromNow} />
    </div>
  );
}
