/**
 * Campaign types exercised by create-campaign-by-type and clone specs.
 * Extend this list when adding new Marketing → Create flows; align `namePattern` with the visible button label.
 */
export const CREATABLE_CAMPAIGN_TYPES: { key: string; namePattern: RegExp }[] = [
  { key: 'Pixl Plus', namePattern: /^Pixl Plus/ },
  { key: 'Mobile Geofencing', namePattern: /^Mobile Geofencing/ },
  { key: 'Historical Geofencing', namePattern: /^Historical Geofencing/ },
  { key: 'Search Keyword', namePattern: /^Search Keyword/ },
  { key: 'Lookalike', namePattern: /^Lookalike/ },
  { key: 'Affinity', namePattern: /^Affinity/ },
  { key: 'Invites', namePattern: /^Invites/ },
  { key: 'Retargeting', namePattern: /^Retargeting/ },
  { key: 'Single Send', namePattern: /^Single Send/ },
  { key: 'Auto Send', namePattern: /^Auto Send/ },
  { key: 'Smart Send', namePattern: /^Smart Send/ },
  { key: 'Drip', namePattern: /^Drip/ },
  { key: 'Email Mapping', namePattern: /^Email Mapping/ },
  { key: 'Tracked Link', namePattern: /^Tracked Link/ },
  { key: 'Landing Page', namePattern: /^Landing Page/ },
  { key: 'Conversation', namePattern: /^Conversation/ },
];
