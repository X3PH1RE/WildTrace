import { create } from "zustand";

import type { SpeciesClassificationResult } from "@wildtrace/shared-types";

type State = {
  lastScan: SpeciesClassificationResult | null;
  setLastScan: (r: SpeciesClassificationResult | null) => void;
};

export const useWildtraceStore = create<State>((set) => ({
  lastScan: null,
  setLastScan: (r) => set({ lastScan: r }),
}));
