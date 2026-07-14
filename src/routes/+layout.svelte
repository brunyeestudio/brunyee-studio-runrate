<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Runrate · Brunyee Studio</title>
</svelte:head>

<div class="dark bg-background text-foreground min-h-svh">
	{@render children()}
</div>
