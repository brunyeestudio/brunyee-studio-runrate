import { describe, expect, it } from 'vitest';
import { classifyHourlyWip, isHourlyBillingType } from './classify-projects';
import type { FxContext, ProjectWip } from './types';

const fx: FxContext = { baseCurrencyCode: 'GBP', rates: { GBP: 1 } };

describe('classify-projects', () => {
	it('detects hourly billing types', () => {
		expect(isHourlyBillingType('based_on_project_hours')).toBe(true);
		expect(isHourlyBillingType('fixed_cost_for_project')).toBe(false);
	});

	it('sums unbilled amount for hourly projects only', () => {
		const projects: ProjectWip[] = [
			{
				projectId: '1',
				projectName: 'Alpha',
				customerName: 'A',
				billingType: 'based_on_project_hours',
				rate: 100,
				unBilledHours: '10:00',
				unBilledAmount: 1000,
				currencyCode: 'GBP'
			},
			{
				projectId: '2',
				projectName: 'Beta',
				customerName: 'B',
				billingType: 'based_on_staff_hours',
				rate: null,
				unBilledHours: '02:00',
				unBilledAmount: 0,
				currencyCode: 'GBP'
			},
			{
				projectId: '3',
				projectName: 'Gamma',
				customerName: 'C',
				billingType: 'based_on_task_hours',
				rate: 80,
				unBilledHours: '05:00',
				unBilledAmount: 400,
				currencyCode: 'GBP'
			}
		];

		const result = classifyHourlyWip(projects, fx);
		expect(result.projects.map((p) => p.projectId)).toEqual(['1', '3']);
		expect(result.total).toBe(1400);
		expect(result.source).toBe('Projects (hourly)');
		expect(result.byCurrency).toEqual([
			{ currencyCode: 'GBP', amount: 1400, convertedAmount: 1400, count: 2 }
		]);
	});
});
