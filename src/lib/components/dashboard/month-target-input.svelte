<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { clampProgress, formatCurrency } from '$lib/runrate/format';
	import InfoHint from './info-hint.svelte';
	import { kpiInfo } from './kpi-info';

	let {
		monthTarget = $bindable<number | undefined>(undefined),
		earnedPipeline = 0,
		cashCollected = 0,
		currencyCode = 'GBP',
		monthLabel = ''
	}: {
		monthTarget?: number | undefined;
		earnedPipeline?: number;
		cashCollected?: number;
		currencyCode?: string;
		monthLabel?: string;
	} = $props();

	const progress = $derived(clampProgress(earnedPipeline, monthTarget ?? 0));
	const displayTarget = $derived(
		monthTarget === undefined || Number.isNaN(monthTarget) ? '' : String(monthTarget)
	);

	function handleInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		if (value.trim() === '') {
			monthTarget = undefined;
			return;
		}
		const parsed = Number(value);
		monthTarget = Number.isFinite(parsed) ? parsed : undefined;
	}
</script>

<Card.Root size="sm" data-testid="month-target">
	<Card.Header class="gap-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<div class="flex items-center gap-1.5">
					<Card.Title class="text-base">Month target</Card.Title>
					<InfoHint label="How month target progress is calculated" text={kpiInfo.monthTarget} />
				</div>
				<Card.Description>
					Compare temporary testing target to earned pipeline for {monthLabel || 'this month'}.
				</Card.Description>
			</div>
			<Badge variant="secondary" data-testid="temporary-label">
				Temporary — cleared when the tab closes
			</Badge>
		</div>
	</Card.Header>
	<Card.Content class="space-y-4">
		<Field.Field>
			<Field.Label for="month-target-input">Temporary target amount</Field.Label>
			<Input
				id="month-target-input"
				type="number"
				min="0"
				step="100"
				placeholder="e.g. 12000"
				value={displayTarget}
				oninput={handleInput}
				data-testid="month-target-input"
			/>
			<Field.Description>Stored in sessionStorage only. Not saved to a database.</Field.Description>
		</Field.Field>

		<div class="space-y-2">
			<div class="text-muted-foreground flex justify-between text-xs">
				<span>Earned pipeline {formatCurrency(earnedPipeline, currencyCode)}</span>
				<span class="tabular-nums">{progress}%</span>
			</div>
			<Progress value={progress} max={100} />
			<p class="text-muted-foreground text-xs">
				Cash collected this month: {formatCurrency(cashCollected, currencyCode)}
			</p>
		</div>
	</Card.Content>
</Card.Root>
