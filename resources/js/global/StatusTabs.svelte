<script lang="ts">
    /**
     * StatusTabs — tab horizontal status dengan counter.
     *
     * @example
     *   <StatusTabs
     *       tabs={[
     *           { value: '', label: 'Semua', count: 20 },
     *           { value: 'pending_payment', label: 'Pending', count: 5 },
     *       ]}
     *       bind:active={selectedStatus}
     *       onchange={(v) => changeStatus(v)}
     *   />
     */

    import type { StatusTab } from '@/types';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        tabs,
        active = $bindable(''),
        onchange = undefined,
    }: {
        tabs: StatusTab[];
        active?: string;
        onchange?: ((value: string) => void) | undefined;
    } = $props();

    // ==========================================
    // HANDLERS
    // ==========================================

    function handleClick(value: string): void {
        active = value;
        onchange?.(value);
    }
</script>

<div class="overflow-x-auto">
    <div
        class="inline-flex items-center bg-gray-100 rounded-2xl p-1.5 min-w-full sm:min-w-0"
        role="tablist"
    >
        {#each tabs as tab (tab.value)}
            <button
                type="button"
                role="tab"
                aria-selected={active === tab.value}
                onclick={() => handleClick(tab.value)}
                class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap
                    {active === tab.value
                    ? 'bg-white text-dark shadow-sm'
                    : 'text-gray-600 hover:text-dark'}"
            >
                {tab.label}
                {#if tab.count !== undefined}
                    <span
                        class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-extrabold
                            {active === tab.value
                            ? 'bg-pink-dark text-white'
                            : 'bg-white text-gray-500'}"
                    >
                        {tab.count}
                    </span>
                {/if}
            </button>
        {/each}
    </div>
</div>