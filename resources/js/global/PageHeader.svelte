<script lang="ts">
    /**
     * PageHeader — header halaman dengan judul + deskripsi + action slot.
     *
     * @example
     *   <PageHeader title="Paket Wisata" description="Kelola paket wisata">
     *       {#snippet actions()}
     *           <a href="/admin/packages/create" use:inertia class="...">Tambah</a>
     *       {/snippet}
     *   </PageHeader>
     */

    import type { Snippet } from 'svelte';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        title,
        description = '',
        actions = undefined,
    }: {
        title: string;
        description?: string;
        actions?: Snippet;
    } = $props();
</script>

<div
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
>
    <div>
        <h1 class="text-2xl font-extrabold text-dark">{title}</h1>
        {#if description}
            <p class="text-sm text-gray-500 mt-1">{description}</p>
        {/if}
    </div>

    {#if actions}
        <div class="flex-shrink-0">
            {@render actions()}
        </div>
    {/if}
</div>