"use client";

import { useEffect, useState } from "react";
import LoadingSpinner1 from "./LoadingSpinner1";
import LoadingSpinner2 from "./LoadingSpinner2";

export default function LoadingSpinner() {
  const [spinner, setSpinner] = useState(0);

  useEffect(() => {
    // Randomly choose between the two spinners
    setSpinner(Math.random() < 0.5 ? 0 : 1);
  }, []);

  return spinner === 0 ? <LoadingSpinner1 /> : <LoadingSpinner2 />;
}
