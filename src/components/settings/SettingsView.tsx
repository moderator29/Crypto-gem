"use client";

import { PreferencesGroups } from "./PreferencesGroups";

/** Settings for this device. There are no accounts, so everything here lives in the browser. */
export function SettingsView() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PreferencesGroups />
    </div>
  );
}
