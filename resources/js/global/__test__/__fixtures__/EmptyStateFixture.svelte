<script lang="ts">
    import EmptyState from '@/global/EmptyState.svelte';

    let {
        title,
        description = '',
        icon = undefined,
        hasFilters = false,
        onClear = undefined,
        actionLabel = '',
        onAction = undefined,
        withSnippet = false,
    }: {
        title: string;
        description?: string;
        icon?: string;
        hasFilters?: boolean;
        onClear?: (() => void) | undefined;
        actionLabel?: string;
        onAction?: (() => void) | undefined;
        withSnippet?: boolean;
    } = $props();
</script>

{#if withSnippet}
    <EmptyState {title} {description} {icon} {hasFilters} {onClear} {actionLabel} {onAction}>
        {#snippet actions()}
            <button type="button">Custom Button dari Snippet</button>
        {/snippet}
    </EmptyState>
{:else}
    <EmptyState {title} {description} {icon} {hasFilters} {onClear} {actionLabel} {onAction} />
{/if}