/** Hover copy explaining how each dashboard figure is calculated. */
export const kpiInfo = {
  paidThisMonth:
    'Sum of cash received this month. Includes paid and partially paid invoices whose last payment date falls in the current month. Partial payments count as total minus remaining balance.',
  earnedLastMonth:
    "Total of non-draft invoices dated the 1st of the previous calendar month — typically last month's work sent on the 1st with NET 30 terms. Includes paid and unpaid invoices; voids and drafts are excluded.",
  earnedThisMonth:
    'Work earned this month that is not yet sent as a regular invoice: draft invoices dated the 1st of next month, plus unbilled amounts from active hourly projects.',
  outstanding:
    'Remaining balance on unpaid and partially paid invoices (including sent, viewed, and overdue) with a balance greater than zero whose due date is today or earlier. Not-yet-due invoices are excluded.',
  monthTarget:
    'Temporary testing target stored in this tab only. Progress compares earned this month to the target. The end-of-month forecast extrapolates that earning rate across the remaining days.',
} as const;
