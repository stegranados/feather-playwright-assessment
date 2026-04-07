/**
 * Campaign types exercised by clone-published flows only.
 * Keep this list independent of `creatable-campaign-types.ts` — many accounts do not have
 * a published campaign for every creatable type; trim or extend here without affecting creation coverage.
 */
export const CLONE_CAMPAIGN_TYPES: { key: string }[] = [
  { key: 'Pixl Plus' },
  { key: 'Mobile Geofencing' },
  { key: 'Historical Geofencing' },
  { key: 'Search Keyword' },
  { key: 'Affinity' },
  { key: 'Invites' },
  { key: 'Retargeting' },
  { key: 'Single Send' },
  { key: 'Auto Send' },
  { key: 'Drip' },
  { key: 'Email Mapping' },
  { key: 'Landing Page' },
  { key: 'Conversation' },
];
