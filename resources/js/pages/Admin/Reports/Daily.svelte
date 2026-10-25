<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import ReportTabs from '@/components/reports/ReportTabs.svelte';
    import ReportFilter from '@/components/reports/ReportFilter.svelte';
    import ExportButtons from '@/components/reports/ExportButtons.svelte';
    import { router } from '@inertiajs/svelte';
    import { adminMenu } from '@/utils/menus';

    let { data, filters } = $props();
    let startDate = $state(filters.start_date);
    let endDate = $state(filters.end_date);

    function applyFilter() {
        router.get(
            '/admin/reports/daily',
            { start_date: startDate, end_date: endDate },
            { preserveState: true },
        );
    }
</script>

<svelte:head>
    <title>Rekap Laporan Harian | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Rekap Laporan Harian" menuItems={adminMenu}>
    <PageHeader
        title="Rekap Laporan Harian"
        description="Pantau aktivitas harian mitra di lapangan."
    >
        {#snippet actions()}
            <ExportButtons
                pdfUrl={`/admin/reports/daily/export-pdf?start_date=${startDate}&end_date=${endDate}`}
                excelUrl={`/admin/reports/daily/export-excel?start_date=${startDate}&end_date=${endDate}`}
            />
        {/snippet}
    </PageHeader>

    <!-- Tabs -->
    <ReportTabs active="daily" />

    <!-- Filter -->
    <ReportFilter bind:startDate bind:endDate onApply={applyFilter} />

    <!-- Ringkasan -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
            <p class="text-gray-500 text-[11px] font-extrabold uppercase tracking-widest mb-1">Total Laporan</p>
            <p class="text-3xl font-extrabold text-dark">{data.total_reports}</p>
        </div>
        <div class="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
            <p class="text-gray-500 text-[11px] font-extrabold uppercase tracking-widest mb-1">Menunggu Verifikasi</p>
            <p class="text-3xl font-extrabold text-yellow-600">{data.pending_verify}</p>
        </div>
        <div class="bg-gradient-to-br from-pink-dark to-purple rounded-3xl p-5 shadow-lg">
            <p class="text-white/80 text-[11px] font-extrabold uppercase tracking-widest mb-1">Terverifikasi</p>
            <p class="text-3xl font-extrabold text-white">{data.verified}</p>
        </div>
    </div>

    <!-- Tabel -->
    <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-gray-100 flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-pink/10 text-pink-text flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <div>
                <h2 class="text-base font-extrabold text-dark">Rincian Laporan</h2>
                <p class="text-xs text-gray-500">{data.reports.length} laporan ditemukan</p>
            </div>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-gray-50/50 text-gray-500 text-[10px] uppercase tracking-widest font-extrabold border-b border-gray-100">
                    <tr>
                        <th class="px-5 py-4">Kode Trip</th>
                        <th class="px-5 py-4">Mitra</th>
                        <th class="px-5 py-4 text-center">Hari</th>
                        <th class="px-5 py-4">Tanggal</th>
                        <th class="px-5 py-4 text-center">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    {#each data.reports as r}
                        <tr class="hover:bg-pink/5 transition-colors">
                            <td class="px-5 py-4 font-mono text-xs font-bold text-dark">{r.trip_kode}</td>
                            <td class="px-5 py-4 font-bold text-dark">{r.mitra}</td>
                            <td class="px-5 py-4 text-center font-bold">Hari {r.hari_ke}</td>
                            <td class="px-5 py-4 text-gray-600">{r.tanggal}</td>
                            <td class="px-5 py-4 text-center">
                                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider
                                    {r.status === 'verified' ? 'bg-green/10 text-green-text border-green/20' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}">
                                    {r.status}
                                </span>
                            </td>
                        </tr>
                    {:else}
                        <tr><td colspan="5" class="px-5 py-10 text-center text-gray-500 italic">Belum ada laporan pada periode ini.</td></tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</DashboardLayout>