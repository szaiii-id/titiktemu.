<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import ReportTabs from '@/components/reports/ReportTabs.svelte';
    import ReportFilter from '@/components/reports/ReportFilter.svelte';
    import ExportButtons from '@/components/reports/ExportButtons.svelte';
    import { router } from '@inertiajs/svelte';
    import { adminMenu } from '@/utils/menus';
    import { formatCurrency } from '@/utils/formatCurrency';

    let { data, filters } = $props();
    let startDate = $state(filters.start_date);
    let endDate = $state(filters.end_date);

    function applyFilter() {
        router.get(
            '/admin/reports/payout',
            { start_date: startDate, end_date: endDate },
            { preserveState: true },
        );
    }
</script>

<svelte:head>
    <title>Laporan Payout | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Laporan Payout" menuItems={adminMenu}>
    <PageHeader
        title="Laporan Pencairan"
        description="Pantau dana yang dicairkan ke mitra."
    >
        {#snippet actions()}
            <ExportButtons
                pdfUrl={`/admin/reports/payout/export-pdf?start_date=${startDate}&end_date=${endDate}`}
                excelUrl={`/admin/reports/payout/export-excel?start_date=${startDate}&end_date=${endDate}`}
            />
        {/snippet}
    </PageHeader>

    <!-- Tabs -->
    <ReportTabs active="payout" />

    <!-- Filter -->
    <ReportFilter bind:startDate bind:endDate onApply={applyFilter} />

    <!-- Ringkasan -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
            <p class="text-gray-500 text-[11px] font-extrabold uppercase tracking-widest mb-1">Total Dicairkan</p>
            <p class="text-3xl font-extrabold text-green-700">{formatCurrency(data.total_dicairkan)}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
            <p class="text-gray-500 text-[11px] font-extrabold uppercase tracking-widest mb-1">Pending / Menunggu</p>
            <p class="text-3xl font-extrabold text-sun-text">{formatCurrency(data.total_pending)}</p>
        </div>
        <div class="bg-gradient-to-br from-pink-dark to-purple rounded-3xl p-5 shadow-lg">
            <p class="text-white/80 text-[11px] font-extrabold uppercase tracking-widest mb-1">Saldo Mengendap</p>
            <p class="text-3xl font-extrabold text-white">{formatCurrency(data.total_saldo_mengendap)}</p>
        </div>
    </div>

    <!-- Tabel -->
    <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-gray-100 flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-pink/10 text-pink-text flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div>
                <h2 class="text-base font-extrabold text-dark">Rincian Pencairan</h2>
                <p class="text-xs text-gray-500">{data.payouts.length} transaksi ditemukan</p>
            </div>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-gray-50/50 text-gray-500 text-[10px] uppercase tracking-widest font-extrabold border-b border-gray-100">
                    <tr>
                        <th class="px-5 py-4">Kode Payout</th>
                        <th class="px-5 py-4">Mitra</th>
                        <th class="px-5 py-4">Tanggal</th>
                        <th class="px-5 py-4 text-right">Jumlah</th>
                        <th class="px-5 py-4 text-center">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    {#each data.payouts as p}
                        <tr class="hover:bg-pink/5 transition-colors">
                            <td class="px-5 py-4 font-mono text-xs font-bold text-dark">{p.kode}</td>
                            <td class="px-5 py-4 font-bold text-dark">{p.mitra}</td>
                            <td class="px-5 py-4 text-gray-600">{p.tanggal}</td>
                            <td class="px-5 py-4 text-right font-extrabold text-dark">{formatCurrency(p.jumlah)}</td>
                            <td class="px-5 py-4 text-center">
                                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider
                                    {p.status === 'paid' ? 'bg-green/10 text-green-text border-green/20' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}">
                                    {p.status}
                                </span>
                            </td>
                        </tr>
                    {:else}
                        <tr>
                            <td colspan="5" class="px-5 py-10 text-center text-gray-500 italic">Belum ada data payout pada periode ini.</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</DashboardLayout>