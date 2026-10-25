<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import { inertia, page } from '@inertiajs/svelte';
    import type {
        DailyReportStatus,
        TripHonorTipe,
        TripMitraRole,
        TripStatus,
    } from '@/types';
    import {
        dailyReportStatusBadge,
        dailyReportStatusLabel,
        tripMitraRoleLabel,
        tripStatusBadge,
        tripStatusLabel,
    } from '@/utils/enums';
    import { formatCurrency } from '@/utils/formatCurrency';
    import { mitraMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type TodayTrip = {
        id: number;
        kode: string;
        status: TripStatus;
        package: { id: number; nama: string; kode: string } | null;
        trip_mitra: {
            role: TripMitraRole;
            honor: string;
            honor_tipe: TripHonorTipe;
        } | null;
        today_day: {
            id: number;
            hari_ke: number;
            tanggal: string;
            judul: string;
            status: string;
            has_report: boolean;
            report_status: DailyReportStatus | null;
        } | null;
    };

    type PendingReport = {
        id: number;
        status: DailyReportStatus;
        submitted_at: string;
        trip_day: {
            hari_ke: number;
            tanggal: string;
            judul: string;
            trip: { id: number; kode: string; package: { nama: string } | null } | null;
        } | null;
    };

    let {
        stats = {
            trips: { scheduled: 0, active: 0, completed: 0, total: 0 },
            daily_reports: { submitted: 0, verified: 0, rejected: 0, total: 0 },
            wallet: { saldo: 0, total_pendapatan: 0, total_dicairkan: 0 },
        },
        todayTrips = [],
        pendingReports = [],
    }: {
        stats?: {
            trips: { scheduled: number; active: number; completed: number; total: number };
            daily_reports: { submitted: number; verified: number; rejected: number; total: number };
            wallet: { saldo: number; total_pendapatan: number; total_dicairkan: number };
        };
        todayTrips?: TodayTrip[];
        pendingReports?: PendingReport[];
    } = $props();

    let user = $derived(page.props.auth?.user);

    // ==========================================
    // DERIVED
    // ==========================================

    let needsReportToday = $derived(
        todayTrips.filter((t) => t.today_day && !t.today_day.has_report),
    );
</script>

<svelte:head>
    <title>Dashboard Mitra | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Dashboard" menuItems={mitraMenu}>
    <!-- WELCOME HEADER (Pink, sesuai tema) -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-dark">
                Halo, {user?.name ?? 'Mitra'}<span class="text-pink-dark">.</span>
            </h1>
            <p class="text-gray-500 mt-1">Ini tugas dan ringkasan Anda hari ini.</p>
        </div>
    </div>

    <!-- ==========================================
         PERLU TINDAKAN (Paling Atas)
    ========================================== -->
    {#if needsReportToday.length > 0}
        <div class="mb-8 bg-sun/10 border-2 border-sun/30 rounded-3xl p-5 sm:p-6">
            <div class="flex items-start gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-sun-dark text-white flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div class="flex-1">
                    <h2 class="text-base font-extrabold text-sun-text">Perlu Tindakan Anda</h2>
                    <p class="text-xs text-sun-text/80 mt-0.5">
                        {needsReportToday.length} trip perlu laporan hari ini.
                    </p>
                </div>
            </div>

            <div class="space-y-2">
                {#each needsReportToday as trip (trip.id)}
                    {#if trip.today_day}
                        <a
                            href={`/mitra/trips/${trip.id}/days/${trip.today_day.id}/report`}
                            use:inertia
                            class="block bg-white rounded-2xl p-3 hover:shadow-md transition-all group border border-gray-100"
                        >
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-dark to-purple text-white flex items-center justify-center font-extrabold text-sm shadow-md flex-shrink-0">
                                    {trip.package?.nama?.charAt(0)?.toUpperCase() ?? '?'}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-extrabold text-dark truncate group-hover:text-pink-text transition-colors">
                                        {trip.package?.nama ?? 'Trip'}
                                    </p>
                                    <p class="text-[11px] text-gray-500">
                                        Hari {trip.today_day.hari_ke} — {trip.today_day.judul}
                                    </p>
                                </div>
                                <div class="w-8 h-8 rounded-full bg-sun-dark text-white flex items-center justify-center flex-shrink-0">
                                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                            </div>
                        </a>
                    {/if}
                {/each}
            </div>
        </div>
    {/if}

    <!-- ==========================================
         TRIP HARI INI
    ========================================== -->
    {#if todayTrips.length > 0}
        <div class="mb-8">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-extrabold text-dark">Trip Hari Ini</h2>
                <a href="/mitra/trips" use:inertia class="inline-flex items-center gap-1.5 text-xs font-bold text-pink-text hover:text-sun-text transition-colors">
                    Lihat Semua
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </a>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each todayTrips as trip (trip.id)}
                    <a
                        href={`/mitra/trips/${trip.id}`}
                        use:inertia
                        class="block bg-white rounded-3xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-pink/30 transition-all group"
                    >
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-dark to-purple text-white flex items-center justify-center font-extrabold text-lg shadow-md flex-shrink-0">
                                {trip.package?.nama?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex flex-wrap items-center gap-2 mb-1">
                                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold {tripStatusBadge(trip.status)}">
                                        <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                                        {tripStatusLabel(trip.status)}
                                    </span>
                                    {#if trip.trip_mitra}
                                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink/10 text-pink-text border border-pink/20">
                                            {tripMitraRoleLabel(trip.trip_mitra.role)}
                                        </span>
                                    {/if}
                                </div>

                                <h3 class="text-sm font-extrabold text-dark group-hover:text-pink-text transition-colors truncate">
                                    {trip.package?.nama ?? 'Trip'}
                                </h3>
                                <p class="text-[11px] text-gray-500 font-mono mt-0.5">{trip.kode}</p>

                                {#if trip.today_day}
                                    <div class="flex flex-wrap items-center gap-2 mt-2">
                                        <span class="inline-flex items-center gap-1 text-xs text-gray-600">
                                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Hari {trip.today_day.hari_ke} — {trip.today_day.judul}
                                        </span>
                                        {#if trip.today_day.has_report && trip.today_day.report_status}
                                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold {dailyReportStatusBadge(trip.today_day.report_status)}">
                                                {dailyReportStatusLabel(trip.today_day.report_status)}
                                            </span>
                                        {:else}
                                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sun/10 text-sun-text border border-sun/20">
                                                Belum lapor
                                            </span>
                                        {/if}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </a>
                {/each}
            </div>
        </div>
    {/if}

    <!-- ==========================================
         WALLET CARD (Paling Bawah)
    ========================================== -->
    <div class="mb-6">
        <a
            href="/mitra/wallet"
            use:inertia
            data-testid="wallet-card"
            class="block bg-gradient-to-br from-green-dark to-green rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all group"
        >
            <div class="flex items-start justify-between gap-3 mb-4">
                <div>
                    <p class="text-[10px] font-extrabold uppercase tracking-widest opacity-80 mb-1">Saldo Wallet</p>
                    <p class="text-3xl sm:text-4xl font-extrabold">{formatCurrency(stats.wallet.saldo)}</p>
                </div>
                <div class="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/20">
                <div class="flex-1">
                    <p class="text-[10px] uppercase tracking-widest opacity-70">Total Pendapatan</p>
                    <p class="text-sm font-bold">{formatCurrency(stats.wallet.total_pendapatan)}</p>
                </div>
                <div class="sm:border-l sm:border-white/20 sm:pl-3">
                    <p class="text-[10px] uppercase tracking-widest opacity-70">Total Dicairkan</p>
                    <p class="text-sm font-bold">{formatCurrency(stats.wallet.total_dicairkan)}</p>
                </div>
            </div>
        </a>
    </div>

    <!-- ==========================================
         LAPORAN PENDING (Jika Ada)
    ========================================== -->
    {#if pendingReports.length > 0}
        <div class="mb-6">
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-lg font-extrabold text-dark">Laporan Menunggu Verifikasi</h2>
                <a href="/mitra/daily-reports?status=submitted" use:inertia class="inline-flex items-center gap-1.5 text-xs font-bold text-pink-text hover:text-sun-text transition-colors">
                    Lihat Semua
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </a>
            </div>
            <div class="space-y-2">
                {#each pendingReports.slice(0, 3) as report (report.id)}
                    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-xl bg-sun/10 text-sun-text flex items-center justify-center flex-shrink-0">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-dark truncate">{report.trip_day?.trip?.package?.nama ?? 'Trip'}</p>
                                <p class="text-[11px] text-gray-500">Hari {report.trip_day?.hari_ke} — {report.trip_day?.judul}</p>
                            </div>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold {dailyReportStatusBadge(report.status)}">
                                {dailyReportStatusLabel(report.status)}
                            </span>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- ==========================================
         PANEL INFO (Bawah)
    ========================================== -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 class="text-lg font-bold text-dark mb-2">Panel Mitra</h2>
        <p class="text-sm text-gray-600 leading-relaxed">
            Gunakan menu di sidebar untuk melihat
            <a href="/mitra/trips" use:inertia class="font-bold text-pink-text hover:text-sun-text">trip yang di-assign</a>,
            <a href="/mitra/daily-reports" use:inertia class="font-bold text-pink-text hover:text-sun-text">laporan harian</a>,
            <a href="/mitra/wallet" use:inertia class="font-bold text-pink-text hover:text-sun-text">wallet & pencairan</a>, dan mengelola profile usaha Anda.
        </p>
    </div>
</DashboardLayout>