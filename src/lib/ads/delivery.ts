import "server-only";
import type { PlacementId } from "./catalog";

export interface ActiveCampaign {
  id: string;
  placement: PlacementId;
  projectName: string;
  headline: string | null;
  creativeDesktop: string;
  creativeMobile: string | null;
}

/**
 * Returns approved campaigns whose paid window includes now. With no database
 * configured there is no inventory, so this returns an empty list and the UI
 * shows an available-placement state instead of a fake advertiser.
 */
export async function getActiveCampaigns(_placement: PlacementId): Promise<ActiveCampaign[]> {
  return [];
}
