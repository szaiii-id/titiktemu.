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
            '/admin/reports/mitra',
            { start_date: startDate, end_date: endDate },
            { preserveState: true },
        );
    }
</script>

<svelte:head>
    <title>Kinerja Mitra | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Laporan Kinerja Mitra" menuItems={adminMenu}>
    <PageHeader
        title="Kinerja Mitra"
        description="Evaluasi performa pemandu wisata Anda berdasarkan trip yang diselesaikan."
    >
        {#snippet actions()}
            <ExportButtons
                pdfUrl={`/admin/reports/mitra/export-pdf?start_date=${startDate}&end_date=${endDate}`}
                excelUrl={`/admin/reports/mitra/export-excel?start_date=${startDate}&end_date=${endDate}`}
            />
        {/snippet}
    </PageHeader>

    <!-- Tabs -->
    <ReportTabs active="mitra" />

    <!-- Filter -->
    <ReportFilter bind:startDate bind:endDate onApply={applyFilter} />

    <!-- Kartu Ringkasan -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg class="w-16 h-16 text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <p class="text-gray-500 text-[11px] font-extrabold uppercase tracking-widest mb-1">Total Mitra Aktif</p>
            <p class="text-3xl font-extrabold text-dark">{data.total_mitra}</p>
        </div>

        <div class="bg-gradient-to-br from-pink-dark to-purple rounded-3xl p-5 shadow-lg relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg class="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p class="text-white/80 text-[11px] font-extrabold uppercase tracking-widest mb-1">Total Trip Diselesaikan</p>
            <p class="text-3xl font-extrabold text-white">{data.total_trip_completed}</p>
        </div>
    </div>

    <!-- Tabel -->
    <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-gray-100 flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-pink/10 text-pink-text flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
            </div>
            <div>
                <h2 class="text-base font-extrabold text-dark">Peringkat Kinerja</h2>
                <p class="text-xs text-gray-500">{data.mitras.length} mitra terdaftar</p>
            </div>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-gray-50/50 text-gray-500 text-[10px] uppercase tracking-widest font-extrabold border-b border-gray-100">
                    <tr>
                        <th class="px-5 py-4">No</th>
                        <th class="px-5 py-4">Nama Mitra</th>
                        <th class="px-5 py-4 text-center">Trip Selesai</th>
                        <th class="px-5 py-4 text-right">Total Honor</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    {#each data.mitras as m, i}
                        <tr class="hover:bg-pink/5 transition-colors">
                            <td class="px-5 py-4 text-gray-500 font-bold">{i + 1}</td>
                            <td class="px-5 py-4">
                                <div class="font-bold text-dark">{m.name}</div>
                                <div class="text-[11px] text-gray-500">{m.email}</div>
                            </td>
                            <td class="px-5 py-4 text-center font-bold">{m.total_trip}</td>
                            <td class="px-5 py-4 text-right font-extrabold text-green-700">{formatCurrency(m.total_honor)}</td>
                        </tr>
                    {:else}
                        <tr>
                            <td colspan="4" class="px-5 py-10 text-center text-gray-500 italic">Belum ada data mitra pada periode ini.</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</DashboardLayout>