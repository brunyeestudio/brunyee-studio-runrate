import { describe, expect, it } from 'vitest';
import {
  classifyHourlyWip,
  isHourlyBillingType,
  withCarriedOverAmounts,
} from './classify-projects';
import type { FxContext, ProjectWip, TimeEntry } from './types';

const fx: FxContext = { baseCurrencyCode: 'GBP', rates: { GBP: 1 } };

function project(partial: Partial<ProjectWip> & Pick<ProjectWip, 'projectId'>): ProjectWip {
  return {
    projectName: `Project ${partial.projectId}`,
    customerName: 'Client',
    billingType: 'based_on_project_hours',
    rate: 100,
    unBilledHours: '10:00',
    unBilledAmount: 1000,
    currencyCode: 'GBP',
    ...partial,
  };
}

function entry(partial: Partial<TimeEntry> & Pick<TimeEntry, 'timeEntryId'>): TimeEntry {
  return {
    customerName: 'Client',
    projectName: 'Project',
    logDate: '2026-07-02',
    hours: 1,
    ...partial,
  };
}

describe('classify-projects', () => {
  it('attributes unbilled amount logged before the month start as carried over', () => {
    const projects = [
      project({ projectId: '1', unBilledAmount: 1000 }),
      project({ projectId: '2', unBilledAmount: 300 }),
    ];
    const entries = [
      entry({ timeEntryId: 'a', projectId: '1', logDate: '2026-06-20', hours: 3 }),
      entry({ timeEntryId: 'b', projectId: '1', logDate: '2026-07-02', hours: 7 }),
      entry({ timeEntryId: 'c', projectId: '2', logDate: '2026-07-03', hours: 3 }),
    ];
    const split = withCarriedOverAmounts(projects, entries, '2026-07-01');
    expect(split.map((p) => p.carriedOverAmount)).toEqual([300, 0]);
    expect(classifyHourlyWip(split, fx).carriedOver).toBe(300);
  });

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
        currencyCode: 'GBP',
      },
      {
        projectId: '2',
        projectName: 'Beta',
        customerName: 'B',
        billingType: 'based_on_staff_hours',
        rate: null,
        unBilledHours: '02:00',
        unBilledAmount: 0,
        currencyCode: 'GBP',
      },
      {
        projectId: '3',
        projectName: 'Gamma',
        customerName: 'C',
        billingType: 'based_on_task_hours',
        rate: 80,
        unBilledHours: '05:00',
        unBilledAmount: 400,
        currencyCode: 'GBP',
      },
    ];

    const result = classifyHourlyWip(projects, fx);
    expect(result.projects.map((p) => p.projectId)).toEqual(['1', '3']);
    expect(result.total).toBe(1400);
    expect(result.source).toBe('Projects (hourly)');
    expect(result.byCurrency).toEqual([
      { currencyCode: 'GBP', amount: 1400, convertedAmount: 1400, count: 2 },
    ]);
  });
});
