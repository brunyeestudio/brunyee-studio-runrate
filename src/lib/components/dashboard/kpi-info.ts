/** Hover copy explaining how each dashboard figure is calculated. */
export const kpiInfo = {
  paidThisMonth:
    'Sum of customer payments received this month, by payment date, at the rate Zoho booked. Earlier instalments, credit notes and write-offs are not counted as cash.',
  earnedLastMonth:
    "Invoices dated the 1st of this month — last month's work, billed on the 1st with NET 30 terms. Includes drafts not yet sent; voids are excluded. Shown excluding tax; the split shows how much of it has been paid.",
  earnedThisMonth:
    'Work earned but not yet sent as a regular invoice: draft invoices dated the 1st of next month (excluding tax), plus all unbilled time on active hourly projects. The breakdown separates unbilled time logged this month from time carried over from earlier months.',
  outstanding:
    'Remaining balance on unpaid and partially paid invoices (including sent, viewed, and overdue) with a balance greater than zero whose due date is today or earlier. Not-yet-due invoices are excluded.',
  monthTarget:
    'Temporary testing target stored in this tab only. Progress compares earned this month to the target. “On current pace” forecasts extrapolate the earning rate across remaining weekdays or all calendar days; unbilled time carried over from earlier months is added as-is, not extrapolated. “To hit target” pace and hours use remaining days after today (Mon–Fri workdays unless weekends are included).',
  hourlyRate:
    'Temporary planning inputs stored in this tab only. Even-spread hours divide the required daily earn by the hourly rate. Assumed-hours mode instead shows how many work days are needed at your assumed weekday hours/day. Capacity assumes fixed weekday hours/day, then counts how many remaining weekend days would still be needed at that same hours/day.',
} as const;
