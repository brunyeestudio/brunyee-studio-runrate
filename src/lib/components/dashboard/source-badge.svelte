<script lang="ts">
  import { Badge } from '$lib/components/ui/badge/index.js';
  import type { RevenueSource } from '$lib/runrate/types';

  let {
    source,
  }: {
    source: RevenueSource;
  } = $props();
</script>

<Badge
  variant="secondary"
  data-testid="source-badge"
  class="text-muted-foreground"
>
  {source}
</Badge>
