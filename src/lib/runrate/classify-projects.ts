import { sumMoney } from './currency';
import {
  HOURLY_BILLING_TYPES,
  type FxContext,
  type HourlyBillingType,
  type ProjectBucket,
  type ProjectWip,
} from './types';

export function isHourlyBillingType(
  billingType: string,
): billingType is HourlyBillingType {
  return (HOURLY_BILLING_TYPES as readonly string[]).includes(billingType);
}

export function classifyHourlyWip(
  projects: ProjectWip[],
  fx: FxContext,
): ProjectBucket {
  const hourly = projects.filter(
    (project) =>
      isHourlyBillingType(project.billingType) && project.unBilledAmount > 0,
  );
  const money = sumMoney(
    hourly,
    (project) => project.unBilledAmount,
    (project) => project.currencyCode,
    fx,
  );
  return {
    projects: hourly,
    total: money.amount,
    byCurrency: money.byCurrency,
    source: 'Projects (hourly)',
  };
}
