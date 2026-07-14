/** Hover copy explaining how each dashboard figure is calculated. */
export const kpiInfo = {
	cashCollected:
		'Sum of cash received this month. Includes paid and partially paid invoices whose last payment date falls in the current month. Partial payments count as total minus remaining balance.',
	earnedPipeline:
		'Work earned this month that is not yet sent as a regular invoice: draft invoices dated the 1st of next month, plus unbilled amounts from active hourly projects.',
	outstanding:
		'Remaining balance on unpaid and partially paid invoices (including sent, viewed, and overdue) with a balance greater than zero whose due date is today or earlier. Not-yet-due invoices are excluded.',
	issuedOnMonthStart:
		'Remaining balance on non-draft invoices dated the 1st of this month. With NET 30 terms this forecasts cash expected about a month later.',
	dueThisMonth:
		'Outstanding balance on invoices whose due date falls in the current month — expected cash in, not create date.',
	dueNextMonth: 'Outstanding balance on invoices whose due date falls in the next calendar month.',
	monthTarget:
		'Temporary testing target stored in this tab only. Progress compares earned pipeline to the target; cash collected is shown for context.'
} as const;
