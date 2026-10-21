<script lang="ts">
    /**
     * EmptyState — tampilan saat list kosong.
     *
     * @example
     *   <EmptyState
     *       icon="M9 5H7a2 2 0 00-2 2v12..."
     *       title="Belum ada booking"
     *       description="Booking dari client akan muncul di sini."
     *   />
     *
     *   <EmptyState
     *       title="Tidak ada hasil"
     *       description="Coba ubah filter."
     *       hasFilters
     *       onClear={() => clearFilters()}
     *   />
     *
     *   <EmptyState
     *       title="Tidak ada hasil"
     *       description="Coba ubah filter."
     *       hasFilters
     *       onClear={() => clearFilters()}
     *       clearLabel="Reset Filter"
     *   />
     */

    import type { Snippet } from 'svelte';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        icon = 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
        title,
        description = '',
        hasFilters = false,
        onClear = undefined,
        clearLabel = 'Hapus Pencarian',
        actionLabel = '',
        onAction = undefined,
        actions = undefined,
    }: {
        icon?: string;
        title: string;
        description?: string;
        hasFilters?: boolean;
        onClear?: (() => void) | undefined;
        clearLabel?: string;
        actionLabel?: string;
        onAction?: (() => void) | undefined;
        actions?: Snippet;
    } = $props();
</script>

<div class="p-16 text-center">
    <div
        class="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center mb-5 shadow-sm"
    >
        <svg
            class="w-10 h-10 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
        >
            <path stroke-linecap="round" stroke-linejoin="round" d={icon} />
        </svg>
    </div>

    <h3 class="text-lg font-extrabold text-dark mb-1">{title}</h3>

    {#if description}
        <p class="text-sm text-gray-500 max-w-xs mx-auto">{description}</p>
    {/if}

    {#if hasFilters && onClear}
        <button
            type="button"
            onclick={onClear}
            class="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md"
        >
            <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                />
            </svg>
            {clearLabel}
        </button>
    {:else if actionLabel && onAction}
        <button
            type="button"
            onclick={onAction}
            class="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md"
        >
            {actionLabel}
        </button>
    {:else if actions}
        <div class="mt-5">
            {@render actions()}
        </div>
    {/if}
</div>