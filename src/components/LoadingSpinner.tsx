"use client";

import { useEffect, useState } from "react";
import LoadingSpinner1 from "./LoadingSpinner1";
import LoadingSpinner2 from "./LoadingSpinner2";
import LoadingSpinner3 from "./LoadingSpinner3";
import LoadingSpinner4 from "./LoadingSpinner4";

export default function LoadingSpinner() {
  const [spinner, setSpinner] = useState(0);

  useEffect(() => {
    // Randomly choose between the four spinners
    const rand = Math.random();
    if (rand < 0.25) setSpinner(0);
    else if (rand < 0.5) setSpinner(1);
    else if (rand < 0.75) setSpinner(2);
    else setSpinner(3);
  }, []);

  if (spinner === 0) return <LoadingSpinner1 />;
  if (spinner === 1) return <LoadingSpinner2 />;
  if (spinner === 2) return <LoadingSpinner3 />;
  return <LoadingSpinner4 />;
}
