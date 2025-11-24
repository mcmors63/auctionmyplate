"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuctionTimer } from "./AuctionTimer";

interface ListingCardProps {
  plate: string;
  price: number;
  endTime: string; // ISO string for auction end
}

export default function ListingCard({ plate, price, endTime }: ListingCardProps) {
  return (
    <Card className="p-4 shadow-lg rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold">{plate}</CardTitle>
      </CardHeader>

      <CardContent>
        <p className="text-gray-700 mb-2">Current Price: £{price.toLocaleString()}</p>

        {/* Auction countdown timer */}
        <div className="mt-2">
          <AuctionTimer endTime={new Date(endTime)} />
        </div>
      </CardContent>
    </Card>
  );
}
