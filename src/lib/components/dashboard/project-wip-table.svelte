<script lang="ts">
  import * as Table from '$lib/components/ui/table/index.js';
  import { formatCurrency, formatHours } from '$lib/runrate/format';
  import type { ProjectWip } from '$lib/runrate/types';
  import SourceBadge from './source-badge.svelte';

  let {
    projects,
    emptyMessage = 'No unbilled hourly project WIP.',
  }: {
    projects: ProjectWip[];
    emptyMessage?: string;
  } = $props();
</script>

<div class="space-y-3" data-testid="project-wip-table">
  <div class="flex items-center justify-between gap-2">
    <p class="text-muted-foreground text-xs tracking-widest uppercase">
      Source
    </p>
    <SourceBadge source="Projects (hourly)" />
  </div>

  {#if projects.length === 0}
    <p class="text-muted-foreground text-sm">{emptyMessage}</p>
  {:else}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Project</Table.Head>
          <Table.Head>Customer</Table.Head>
          <Table.Head>Billing</Table.Head>
          <Table.Head>Currency</Table.Head>
          <Table.Head>Unbilled hours</Table.Head>
          <Table.Head class="text-right">Unbilled amount</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each projects as project (project.projectId)}
          <Table.Row>
            <Table.Cell class="font-medium">{project.projectName}</Table.Cell>
            <Table.Cell>{project.customerName}</Table.Cell>
            <Table.Cell class="capitalize">
              {project.billingType.replaceAll('_', ' ')}
            </Table.Cell>
            <Table.Cell>{project.currencyCode}</Table.Cell>
            <Table.Cell class="tabular-nums"
              >{formatHours(project.unBilledHours)}</Table.Cell
            >
            <Table.Cell class="text-right tabular-nums">
              {formatCurrency(project.unBilledAmount, project.currencyCode)}
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  {/if}
</div>
