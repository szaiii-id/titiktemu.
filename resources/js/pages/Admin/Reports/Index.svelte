<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import { router } from '@inertiajs/svelte';
    import { adminMenu } from '@/utils/menus';
    import { formatCurrency } from '@/utils/formatCurrency';
    import { AreaChart } from '@faintshadow/flarecharts';

    let { data, monthly_revenue, filters } = $props();

    let startDate = $state(filters.start_date);
    let endDate = $state(filters.end_date);

    function applyFilter() {
        router.get(
            '/admin/reports',
            { start_date: startDate, end_date: endDate },
            { preserveState: true },
        );
    }

    let revenueChartData = $derived([
        {
            name: 'Pendapatan',
            data: monthly_revenue.map((d: any) => ({
                x: d.bulan,
                y: d.total,
            })),
        },
    ]);
</script>

<svelte:head>
    <title>Laporan Pendapatan | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Laporan Pendapatan" menuItems={adminMenu}>
    <PageHeader
        title="Laporan Pendapatan"
        description="Pantau performa keuangan dan tren bisnis Anda."
    >
        {#snippet actions()}
            <a
                href={`/admin/reports/export-pdf?start_date=${startDate}&end_date=${endDate}`}
                target="_blank"
                class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
            >
                <svg class="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                PDF
            </a>
            <a
                href={`/admin/reports/export-excel?start_date=${startDate}&end_date=${endDate}`}
                class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-green-700 text-white font-bold text-sm hover:bg-green-800 transition-all shadow-sm"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Excel
            </a>
        {/snippet}
    </PageHeader>

    <!-- Tabs Navigasi -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
        <a href="/admin/reports" class="px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm shadow-md transition-all whitespace-nowrap">
            Pendapatan
        </a>
        <a href="/admin/reports/mitra" class="px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all shadow-sm whitespace-nowrap">
            Kinerja Mitra
        </a>
        <a href="/admin/reports/daily" class="px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all shadow-sm whitespace-nowrap">
            Rekap Harian
        </a>
        <a href="/admin/reports/payout" class="px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all shadow-sm whitespace-nowrap">
            Payout
        </a>
    </div>

    <!-- Filter Section -->
    <div class="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-6">
        <div class="flex flex-col sm:flex-row items-end gap-4">
            <div class="flex-1 w-full sm:w-auto">
                <label
                    for="report-start-date"
                    class="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5"
                >
                    Dari Tanggal
                </label>
                <input
                    id="report-start-date"
                    type="date"
                    bind:value={startDate}
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all"
                />
            </div>
            <div class="flex-1 w-full sm:w-auto">
                <label
                    for="report-end-date"
                    class="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5"
                >
                    Sampai Tanggal
                </label>
                <input
                    id="report-end-date"
                    type="date"
                    bind:value={endDate}
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all"
                />
            </div>
            <button
                onclick={applyFilter}
                class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-dark text-white font-bold text-sm hover:bg-gray-800 transition-all shadow-md"
            >
                Terapkan Filter
            </button>
        </div>
    </div>

    <!-- Kartu Ringkasan -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-gradient-to-br from-pink-dark to-purple rounded-3xl p-5 shadow-lg relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg class="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p class="text-white/80 text-[11px] font-extrabold uppercase tracking-widest mb-1">Total Pendapatan</p>
            <p class="text-2xl sm:text-3xl font-extrabold text-white">{formatCurrency(data.total_revenue)}</p>
        </div>

        <div class="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg class="w-16 h-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <p class="text-gray-500 text-[11px] font-extrabold uppercase tracking-widest mb-1">Honor Mitra</p>
            <p class="text-2xl sm:text-3xl font-extrabold text-red-700">{formatCurrency(data.total_honor)}</p>
        </div>

        <div class="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg class="w-16 h-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <p class="text-gray-500 text-[11px] font-extrabold uppercase tracking-widest mb-1">Laba Kotor</p>
            <p class="text-2xl sm:text-3xl font-extrabold text-green-700">{formatCurrency(data.gross_profit)}</p>
        </div>
    </div>

    <!-- Grafik -->
    <div class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6 mb-6">
        <div class="flex items-center justify-between mb-8">
            <div>
                <h3 class="text-base font-extrabold text-dark">Tren Pendapatan</h3>
                <p class="text-xs text-gray-500">6 Bulan Terakhir</p>
            </div>
        </div>

        <div class="h-64">
            <AreaChart
                series={revenueChartData}
                xAxis={{ type: 'band' }}
                yAxis={{ type: 'linear' }}
            />
        </div>
    </div>

    <!-- Tabel Transaksi -->
    <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-gray-100 flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-pink/10 text-pink-text flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            </div>
            <div>
                <h2 class="text-base font-extrabold text-dark">Rincian Transaksi</h2>
                <p class="text-xs text-gray-500">{data.transactions.length} transaksi ditemukan</p>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-gray-50/50 text-gray-500 text-[10px] uppercase tracking-widest font-extrabold border-b border-gray-100">
                    <tr>
                        <th class="px-5 py-4">Kode</th>
                        <th class="px-5 py-4">Tanggal</th>
                        <th class="px-5 py-4">Client</th>
                        <th class="px-5 py-4">Paket</th>
                        <th class="px-5 py-4 text-right">Total</th>
                        <th class="px-5 py-4 text-center">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    {#each data.transactions as t}
                        <tr class="hover:bg-pink/5 transition-colors">
                            <td class="px-5 py-4 font-mono text-xs font-bold text-dark">{t.kode}</td>
                            <td class="px-5 py-4 text-gray-600">{t.tanggal}</td>
                            <td class="px-5 py-4 font-bold text-dark">{t.client}</td>
                            <td class="px-5 py-4 text-gray-600 truncate max-w-[200px]">{t.paket}</td>
                            <td class="px-5 py-4 text-right font-extrabold text-dark">{formatCurrency(t.total)}</td>
                            <td class="px-5 py-4 text-center">
                                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-green/10 text-green-text border border-green/20 uppercase tracking-wider">
                                    {t.status}
                                </span>
                            </td>
                        </tr>
                    {:else}
                        <tr>
                            <td colspan="6" class="px-5 py-10 text-center text-gray-500 italic">Belum ada transaksi pada periode ini.</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</DashboardLayout>