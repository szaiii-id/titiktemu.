<script lang="ts">
    let { active }: { active: string } = $props();

    const tabs = [
        { key: 'pendapatan', label: 'Pendapatan', href: '/admin/reports' },
        { key: 'mitra', label: 'Kinerja Mitra', href: '/admin/reports/mitra' },
        { key: 'daily', label: 'Rekap Harian', href: '/admin/reports/daily' },
        { key: 'payout', label: 'Payout', href: '/admin/reports/payout' },
    ];
</script>

<div class="flex gap-2 mb-6 overflow-x-auto pb-2">
    {#each tabs as tab}
        <a 
            href={tab.href} 
            class="px-5 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap
                {active === tab.key 
                    ? 'bg-pink-dark text-white shadow-md' 
                    : 'bg-white border border-gray-200 text-dark hover:bg-gray-50 shadow-sm'}"
        >
            {tab.label}
        </a>
    {/each}
</div>