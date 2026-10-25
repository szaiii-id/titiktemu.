<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import { page, inertia } from '@inertiajs/svelte';
    import { adminMenu } from '@/utils/menus';
    import { formatCurrency } from '@/utils/formatCurrency';
    import { AreaChart } from '@faintshadow/flarecharts';

    let { stats, recent_bookings = [], monthly_revenue = [], monthly_bookings = [] } = $props();
    let user = $derived(page.props.auth?.user);

    // Flarecharts membutuhkan format: [{ name: 'Series Name', data: [{ x: 'Label', y: Value }] }]
    let revenueChartData = $derived([
        {
            name: 'Pendapatan',
            data: monthly_revenue.map((d: any) => ({ x: d.bulan, y: d.total }))
        }
    ]);

    let bookingChartData = $derived([
        {
            name: 'Booking',
            data: monthly_bookings.map((d: any) => ({ x: d.bulan, y: d.total }))
        }
    ]);
</script>

<svelte:head><title>Dashboard Admin | Titiktemu</title></svelte:head>

<DashboardLayout title="Dashboard" menuItems={adminMenu}>
    <!-- HEADER & WELCOME -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-dark">
                Halo, {user?.name ?? 'Admin'}<span class="text-pink-dark">.</span>
            </h1>
            <p class="text-gray-500 mt-1">Ini ringkasan performa bisnis Anda hari ini.</p>
        </div>
        <div class="flex gap-2">
            <a href="/admin/reports" use:inertia class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 shadow-sm transition-all">
                <svg class="w-4 h-4 text-pink-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Lihat Laporan
            </a>
        </div>
    </div>

    <!-- RINGKASAN UTAMA (4 KARTU) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <!-- Pendapatan -->
        <div class="bg-gradient-to-br from-pink-dark to-purple rounded-3xl p-5 shadow-lg relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg class="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p class="text-white/80 text-[11px] font-extrabold uppercase tracking-widest mb-1">Total Pendapatan</p>
            <p class="text-2xl font-extrabold text-white">{formatCurrency(stats.total_revenue)}</p>
            <p class="text-[10px] text-white/60 mt-1">Laba Kotor: {formatCurrency(stats.total_revenue - stats.total_honor)}</p>
        </div>

        <!-- Trip Aktif -->
        <div class="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg class="w-16 h-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p class="text-gray-500 text-[11px] font-extrabold uppercase tracking-widest mb-1">Trip Sedang Jalan</p>
            <p class="text-2xl font-extrabold text-dark">{stats.trips.active}</p>
            <a href="/admin/trips?status=active" use:inertia class="text-[10px] font-bold text-blue-text hover:underline mt-2 block">Lihat Detail →</a>
        </div>

        <!-- Laporan Menunggu -->
        <div class="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg class="w-16 h-16 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <p class="text-gray-500 text-[11px] font-extrabold uppercase tracking-widest mb-1">Laporan Menunggu</p>
            <p class="text-2xl font-extrabold text-dark">{stats.daily_reports.submitted}</p>
            <a href="/admin/daily-reports?status=submitted" use:inertia class="text-[10px] font-bold text-sun-text hover:underline mt-2 block">Verifikasi Sekarang →</a>
        </div>

        <!-- Payout Pending -->
        <div class="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg class="w-16 h-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <p class="text-gray-500 text-[11px] font-extrabold uppercase tracking-widest mb-1">Payout Menunggu</p>
            <p class="text-2xl font-extrabold text-dark">{stats.payouts.pending}</p>
            <a href="/admin/payouts?status=pending" use:inertia class="text-[10px] font-bold text-red-700 hover:underline mt-2 block">Review Payout →</a>
        </div>
    </div>

    <!-- ✅ GRAFIK GANDA (FLARECHARTS) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Grafik 1: Area Chart Pendapatan -->
        <div class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="text-base font-extrabold text-dark">Tren Pendapatan</h3>
                    <p class="text-xs text-gray-500">6 Bulan Terakhir</p>
                </div>
                <a href="/admin/reports" use:inertia class="text-xs font-bold text-pink-text hover:underline">Detail →</a>
            </div>
            
            <div class="h-56">
                <AreaChart 
                    series={revenueChartData}
                    xAxis={{ type: 'band' }}
                    yAxis={{ type: 'linear' }}
                />
            </div>
        </div>

        <!-- Grafik 2: Area Chart Booking -->
        <div class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="text-base font-extrabold text-dark">Tren Booking</h3>
                    <p class="text-xs text-gray-500">6 Bulan Terakhir</p>
                </div>
                <a href="/admin/bookings" use:inertia class="text-xs font-bold text-pink-text hover:underline">Detail →</a>
            </div>
            
            <div class="h-56">
                <AreaChart 
                    series={bookingChartData}
                    xAxis={{ type: 'band' }}
                    yAxis={{ type: 'linear' }}
                />
            </div>
        </div>
    </div>

    <!-- BOOKING TERBARU -->
    <div class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6 mb-8">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-extrabold text-dark">Booking Terbaru</h3>
            <a href="/admin/bookings" use:inertia class="text-xs font-bold text-pink-text hover:underline">Semua →</a>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {#each recent_bookings as b}
                <a href={`/admin/bookings/${b.id}`} use:inertia class="block p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                    <div class="flex items-center justify-between gap-2">
                        <div class="min-w-0">
                            <p class="text-xs font-mono font-bold text-dark truncate">{b.kode}</p>
                            <p class="text-[11px] text-gray-500 truncate">{b.client}</p>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-green-100 text-green-800 uppercase">{b.status}</span>
                    </div>
                    <p class="text-xs font-bold text-dark mt-1">{formatCurrency(b.total)}</p>
                </a>
            {:else}
                <p class="text-xs text-gray-500 italic text-center py-4 col-span-full">Belum ada booking terbaru.</p>
            {/each}
        </div>
    </div>

    <!-- WIDGET "PERLU TINDAKAN" -->
    {#if stats.daily_reports.submitted > 0 || stats.payouts.pending > 0 || stats.trips.needs_mitra > 0}
        <div class="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-3xl p-5 sm:p-6">
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg class="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                    <h4 class="text-sm font-extrabold text-orange-900 mb-1">Perlu Tindakan Anda</h4>
                    <ul class="text-xs text-orange-800 space-y-1">
                        {#if stats.daily_reports.submitted > 0}
                            <li>• <a href="/admin/daily-reports?status=submitted" use:inertia class="font-bold underline">{stats.daily_reports.submitted} laporan harian</a> menunggu verifikasi.</li>
                        {/if}
                        {#if stats.payouts.pending > 0}
                            <li>• <a href="/admin/payouts?status=pending" use:inertia class="font-bold underline">{stats.payouts.pending} pengajuan payout</a> menunggu review.</li>
                        {/if}
                        {#if stats.trips.needs_mitra > 0}
                            <li>• <a href="/admin/trips" use:inertia class="font-bold underline">{stats.trips.needs_mitra} trip</a> belum punya mitra.</li>
                        {/if}
                    </ul>
                </div>
            </div>
        </div>
    {/if}
</DashboardLayout>