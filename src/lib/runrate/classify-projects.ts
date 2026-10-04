import { sumMoney } from './currency';
import {
  HOURLY_BILLING_TYPES,
  type FxContext,
  type HourlyBillingType,
  type ProjectBucket,
  type ProjectWip,
  type TimeEntry,
} from './types';

export function isHourlyBillingType(billingType: string): billingType is HourlyBillingType {
  return (HOURLY_BILLING_TYPES as readonly string[]).includes(billingType);
}

/**
 * Split each project's unbilled amount by when its unbilled time was logged.
 * Zoho only reports the project-level amount, so the carried-over share is
 * pro rata to hours (exact for project-hour rates, approximate for staff/task rates).
 */
export function withCarriedOverAmounts(
  projects: ProjectWip[],
  unbilledEntries: TimeEntry[],
  monthStart: string,
): ProjectWip[] {
  const hoursByProject = new Map<string, { earlier: number; total: number }>();
  for (const entry of unbilledEntries) {
    if (!entry.projectId) continue;
    const hours = hoursByProject.get(entry.projectId) ?? { earlier: 0, total: 0 };
    hours.total += entry.hours;
    if (entry.logDate < monthStart) hours.earlier += entry.hours;
    hoursByProject.set(entry.projectId, hours);
  }

  return projects.map((project) => {
    const hours = hoursByProject.get(project.projectId);
    const share = hours && hours.total > 0 ? hours.earlier / hours.total : 0;
    return { ...project, carriedOverAmount: project.unBilledAmount * share };
  });
}

export function classifyHourlyWip(projects: ProjectWip[], fx: FxContext): ProjectBucket {
  const hourly = projects.filter(
    (project) => isHourlyBillingType(project.billingType) && project.unBilledAmount > 0,
  );
  const money = sumMoney(
    hourly,
    (project) => project.unBilledAmount,
    (project) => project.currencyCode,
    fx,
  );
  const carriedOver = sumMoney(
    hourly,
    (project) => project.carriedOverAmount ?? 0,
    (project) => project.currencyCode,
    fx,
  );
  return {
    projects: hourly,
    total: money.amount,
    byCurrency: money.byCurrency,
    carriedOver: carriedOver.amount,
    carriedOverByCurrency: carriedOver.byCurrency,
    source: 'Projects (hourly)',
  };
}
