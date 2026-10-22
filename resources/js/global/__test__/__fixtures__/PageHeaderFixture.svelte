<script lang="ts">
    import PageHeader from '@/global/PageHeader.svelte';

    let {
        title = 'Judul',
        description = '',
        withSnippet = false,
    }: {
        title?: string;
        description?: string;
        withSnippet?: boolean;
    } = $props();
</script>

{#if withSnippet}
    <PageHeader {title} {description}>
        {#snippet actions()}
            <button type="button">Tambah Data</button>
        {/snippet}
    </PageHeader>
{:else}
    <PageHeader {title} {description} />
{/if}