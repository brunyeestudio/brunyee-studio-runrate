import { parseHours } from '$lib/runrate/format';
import type { TimeEntry } from '$lib/runrate/types';
import { zohoFetch, type ZohoClientOptions } from './client';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ZohoTimeEntryRaw {
  time_entry_id?: string;
  customer_name?: string;
  project_name?: string;
  log_date?: string;
  date?: string;
  hours?: number | string;
  billed_hours?: number | string;
  time?: number | string;
}

interface ListTimeEntriesResponse {
  time_entries?: ZohoTimeEntryRaw[];
  page_context?: {
    page?: number;
    per_page?: number;
    has_more_page?: boolean;
  };
}

export function mapZohoTimeEntry(raw: ZohoTimeEntryRaw): TimeEntry | null {
  const timeEntryId = String(raw.time_entry_id ?? '').trim();
  if (!timeEntryId) return null;

  const logDate = String(raw.log_date ?? raw.date ?? '')
    .trim()
    .slice(0, 10);
  if (!ISO_DATE_RE.test(logDate)) return null;

  return {
    timeEntryId,
    customerName: String(raw.customer_name ?? ''),
    projectName: String(raw.project_name ?? ''),
    logDate,
    hours: parseHours(raw.hours ?? raw.billed_hours ?? raw.time),
  };
}

/** Paginate time entries in a date range (max 200 per page). */
export async function fetchTimeEntriesInRange(
  from: string,
  to: string,
  options: ZohoClientOptions = {},
): Promise<TimeEntry[]> {
  const results: TimeEntry[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await zohoFetch<ListTimeEntriesResponse>(
      '/projects/timeentries',
      {
        from_date: from,
        to_date: to,
        page,
        per_page: 200,
      },
      options,
    );
    for (const raw of data.time_entries ?? []) {
      const mapped = mapZohoTimeEntry(raw);
      if (mapped) results.push(mapped);
    }
    hasMore = Boolean(data.page_context?.has_more_page);
    page += 1;
    if (page > 50) break;
  }

  return results;
}
