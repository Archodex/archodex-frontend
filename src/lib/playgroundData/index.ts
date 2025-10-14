import accountsData from './accounts.json';
import inventoryData from './inventory.json';
import secretsData from './secrets.json';

const CAPTURE_TIMESTAMP = new Date('2025-06-20T00:15:24.419032542Z');

const updateTimestamp = (original: string): string => {
  return new Date(Date.now() - (CAPTURE_TIMESTAMP.getTime() - new Date(original).getTime())).toISOString();
};

const updateTimestamps = (data: QueryResponse): QueryResponse => {
  data = structuredClone(data);

  for (const resource of data.resources ?? []) {
    resource.first_seen_at = updateTimestamp(resource.first_seen_at);
    resource.last_seen_at = updateTimestamp(resource.last_seen_at);
  }

  for (const event of data.events ?? []) {
    event.first_seen_at = updateTimestamp(event.first_seen_at);
    event.last_seen_at = updateTimestamp(event.last_seen_at);
  }

  return data;
};

export const accounts = () => structuredClone(accountsData);
export const inventory = () => updateTimestamps(inventoryData);
export const secrets = () => updateTimestamps(secretsData);
