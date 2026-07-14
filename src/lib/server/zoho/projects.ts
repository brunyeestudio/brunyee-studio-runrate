import { parseAmount } from '$lib/runrate/format';
import { isHourlyBillingType } from '$lib/runrate/classify-projects';
import type { ProjectWip } from '$lib/runrate/types';
import { zohoFetch, type ZohoClientOptions } from './client';

interface ZohoProjectListItem {
	project_id?: string;
	project_name?: string;
	customer_name?: string;
	billing_type?: string;
	rate?: number | string;
	currency_code?: string;
	status?: string;
}

interface ListProjectsResponse {
	projects?: ZohoProjectListItem[];
	page_context?: {
		page?: number;
		has_more_page?: boolean;
	};
}

interface ZohoProjectDetail {
	project?: {
		project_id?: string;
		project_name?: string;
		customer_name?: string;
		billing_type?: string;
		rate?: number | string;
		un_billed_hours?: string;
		un_billed_amount?: number | string;
		currency_code?: string;
	};
}

export function mapZohoProjectDetail(
	raw: NonNullable<ZohoProjectDetail['project']>
): ProjectWip | null {
	const billingType = String(raw.billing_type ?? '');
	if (!isHourlyBillingType(billingType)) return null;

	return {
		projectId: String(raw.project_id ?? ''),
		projectName: String(raw.project_name ?? ''),
		customerName: String(raw.customer_name ?? ''),
		billingType,
		rate:
			raw.rate === undefined || raw.rate === null || raw.rate === '' ? null : parseAmount(raw.rate),
		unBilledHours: String(raw.un_billed_hours ?? '00:00'),
		unBilledAmount: parseAmount(raw.un_billed_amount),
		currencyCode: String(raw.currency_code ?? 'GBP')
	};
}

export async function listActiveProjects(
	options: ZohoClientOptions = {}
): Promise<ZohoProjectListItem[]> {
	const results: ZohoProjectListItem[] = [];
	let page = 1;
	let hasMore = true;

	while (hasMore) {
		const data = await zohoFetch<ListProjectsResponse>(
			'/projects',
			{ filter_by: 'Status.Active', page, per_page: 200 },
			options
		);
		results.push(...(data.projects ?? []));
		hasMore = Boolean(data.page_context?.has_more_page);
		page += 1;
		if (page > 50) break;
	}

	return results;
}

export async function getProjectDetail(
	projectId: string,
	options: ZohoClientOptions = {}
): Promise<ProjectWip | null> {
	const data = await zohoFetch<ZohoProjectDetail>(`/projects/${projectId}`, {}, options);
	if (!data.project) return null;
	return mapZohoProjectDetail(data.project);
}

export async function fetchHourlyProjectWip(
	options: ZohoClientOptions = {}
): Promise<ProjectWip[]> {
	const projects = await listActiveProjects(options);
	const hourlyCandidates = projects.filter((project) =>
		isHourlyBillingType(String(project.billing_type ?? ''))
	);

	const details = await Promise.all(
		hourlyCandidates.map(async (project) => {
			const id = String(project.project_id ?? '');
			if (!id) return null;
			return getProjectDetail(id, options);
		})
	);

	return details.filter((project): project is ProjectWip => project !== null);
}
