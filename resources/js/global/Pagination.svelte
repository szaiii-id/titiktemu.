<script lang="ts">
    /**
     * Pagination — navigasi halaman untuk list dengan meta dari Laravel.
     *
     * @example
     *   <Pagination meta={bookings} label="booking" />
     *   <Pagination meta={packages} label="paket" />
     */

    import type { PaginationMeta } from '@/types';
    import { inertia } from '@inertiajs/svelte';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        meta,
        label = 'item',
        showWhenEmpty = false,
        class: className = '',
    }: {
        meta: PaginationMeta;
        label?: string;
        showWhenEmpty?: boolean;
        class?: string;
    } = $props();

    // ==========================================
    // DERIVED
    // ==========================================

    let visible = $derived(showWhenEmpty || meta.last_page > 1);
</script>

{#if visible}
    <div
        class={[
            'p-4 sm:p-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4',
            className,
        ].join(' ')}
    >
        <p class="text-xs text-gray-500">
            Menampilkan
            <span class="font-extrabold text-dark">{meta.from ?? 0}</span>–<span
                class="font-extrabold text-dark">{meta.to ?? 0}</span
            >
            dari
            <span class="font-extrabold text-dark">{meta.total}</span>
            {label}
        </p>

        <div class="flex items-center gap-1" role="navigation" aria-label="Pagination">
            {#each meta.links as link, i (i)}
                {#if link.url === null}
                    <span
                        class="px-3.5 py-2.5 text-xs text-gray-300 font-bold select-none"
                        aria-disabled="true"
                    >
                        {@html link.label}
                    </span>
                {:else}
                    <a
                        href={link.url}
                        use:inertia
                        class="min-w-[36px] text-center px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all
                            {link.active
                            ? 'bg-pink-dark text-white shadow-md shadow-pink/30'
                            : 'text-gray-600 hover:bg-gray-100'}"
                        aria-current={link.active ? 'page' : undefined}
                    >
                        {@html link.label}
                    </a>
                {/if}
            {/each}
        </div>
    </div>
{/if}