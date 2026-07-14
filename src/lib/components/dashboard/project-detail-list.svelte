<script lang="ts">
  import { formatCurrency, formatHours } from '$lib/runrate/format';
  import type { ProjectWip } from '$lib/runrate/types';

  let {
    projects,
    emptyMessage = 'No contributing items.',
  }: {
    projects: ProjectWip[];
    emptyMessage?: string;
  } = $props();
</script>

{#if projects.length === 0}
  <p class="text-muted-foreground text-xs" data-testid="project-detail-empty">
    {emptyMessage}
  </p>
{:else}
  <ul class="divide-border divide-y" data-testid="project-detail-list">
    {#each projects as project (project.projectId)}
      <li
        class="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
      >
        <div class="min-w-0 space-y-0.5">
          <p class="truncate text-xs font-medium">
            {project.projectName}
            <span class="text-muted-foreground font-normal"
              >· {project.customerName}</span
            >
          </p>
          <p class="text-muted-foreground truncate text-[0.6875rem] capitalize">
            {formatHours(project.unBilledHours)} unbilled ·
            {project.billingType.replaceAll('_', ' ')}
            · {project.currencyCode}
          </p>
        </div>
        <span class="shrink-0 text-xs tabular-nums">
          {formatCurrency(project.unBilledAmount, project.currencyCode)}
        </span>
      </li>
    {/each}
  </ul>
{/if}
