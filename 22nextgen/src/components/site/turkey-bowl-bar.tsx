"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "./btn";
import { LOMBARDI_DIRECTIONS_URL } from "@/lib/events/turkey-bowl";

/** Stays out of the first screen so the hero copy is not covered, then keeps schedule and directions in reach. */
export function TurkeyBowlMobileBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 360);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#080808]/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
        <ButtonLink href="#check-in" size="sm" className="w-full">Schedule</ButtonLink>
        <ButtonLink href={LOMBARDI_DIRECTIONS_URL} external variant="outline" size="sm" className="w-full">Directions</ButtonLink>
      </div>
    </div>
  );
}
