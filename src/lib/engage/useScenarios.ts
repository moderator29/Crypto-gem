"use client";

import { useCallback } from "react";
import type { ParamSpec, Values } from "./params";
import { addScenario, MAX_SCENARIOS, parseScenarios, removeScenario, scenarioKey, type AddResult, type Scenario } from "./scenarios";
import { markScenarioSaved } from "./progress";
import { readRaw, writeRaw } from "./store";
import { useStored } from "./useStored";

export interface ScenarioApi {
  list: Scenario[];
  max: number;
  save: (label: string, values: Values) => AddResult;
  remove: (id: string) => void;
}

/** Saved scenarios for one calculator, kept in this browser only. At most ten per calculator. */
export function useScenarios(slug: string, spec: ParamSpec, defaults: Values): ScenarioApi {
  const key = scenarioKey(slug);
  const list = useStored(key, (raw) => parseScenarios(raw, spec, defaults));
  const save = useCallback(
    (label: string, values: Values): AddResult => {
      const current = parseScenarios(readRaw(key), spec, defaults);
      const r = addScenario(current, label, values, Date.now());
      if (r.ok) {
        writeRaw(key, JSON.stringify(r.list));
        markScenarioSaved();
      }
      return r;
    },
    [key, spec, defaults],
  );
  const remove = useCallback(
    (id: string) => {
      writeRaw(key, JSON.stringify(removeScenario(parseScenarios(readRaw(key), spec, defaults), id)));
    },
    [key, spec, defaults],
  );
  return { list, max: MAX_SCENARIOS, save, remove };
}
