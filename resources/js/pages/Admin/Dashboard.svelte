<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import StatCard from '@/global/StatCard.svelte';
    import { page, inertia } from '@inertiajs/svelte';
    import type { TripStatus } from '@/types';
    import { adminMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type Stats = {
        totalAdmin: number;
        totalMitra: number;
        totalClient: number;
        packages: {
            draft: number;
            aktif: number;
            arsip: number;
            total: number;
        };
        bookings: {
            pending_payment: number;
            payment_verified: number;
            confirmed: number;
            in_progress: number;
            completed: number;
            cancelled: number;
            total: number;
            needs_attention: number;
        };
        trips: {
            scheduled: number;
            active: number;
            completed: number;
            cancelled: number;
            total: number;
            needs_mitra: number;
        };
        daily_reports: {
            submitted: number;
            verified: number;
            rejected: number;
            total: number;
        };
        payouts: {
            pending: number;
            approved: number;
            paid: number;
            rejected: number;
            total: number;
        };
    };

    let {
        stats = {
            totalAdmin: 0,
            totalMitra: 0,
            totalClient: 0,
            packages: { draft: 0, aktif: 0, arsip: 0, total: 0 },
            bookings: {
                pending_payment: 0,
                payment_verified: 0,
                confirmed: 0,
                in_progress: 0,
                completed: 0,
                cancelled: 0,
                total: 0,
                needs_attention: 0,
            },
            trips: {
                scheduled: 0,
                active: 0,
                completed: 0,
                cancelled: 0,
                total: 0,
                needs_mitra: 0,
            },
            daily_reports: {
                submitted: 0,
                verified: 0,
                rejected: 0,
                total: 0,
            },
            payouts: {
                pending: 0,
                approved: 0,
                paid: 0,
                rejected: 0,
                total: 0,
            },
        },
    }: {
        stats?: Stats;
    } = $props();

    let user = $derived(page.props.auth?.user);
</script>

<svelte:head><title>Dashboard Admin | Titiktemu</title></svelte:head>

<DashboardLayout title="Dashboard" menuItems={adminMenu}>
    <!-- Welcome Banner -->
    <div
        class="bg-gradient-to-r from-pink-dark to-purple rounded-3xl p-8 text-white shadow-lg mb-6"
    >
        <h1 class="text-3xl sm:text-4xl font-extrabold mb-2">
            Selamat Datang, {user?.name ?? 'Admin'}<span class="text-sun"
                >.</span
            >
        </h1>
        <p class="text-sm sm:text-base opacity-90">
            Kelola platform Titiktemu dari sini. Semua data ada di
            tangan Anda.
        </p>
    </div>

    <!-- BOOKING -->
    <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-lg font-extrabold text-dark">
                    Booking
                </h2>
                {#if stats.bookings.needs_attention > 0}
                    <span
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sun/10 text-sun-text border border-sun/20"
                    >
                        <svg
                            class="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="3"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                        {stats.bookings.needs_attention} butuh perhatian
                    </span>
                {/if}
            </div>
            <a
                href="/admin/bookings"
                use:inertia
                class="inline-flex items-center gap-1.5 text-xs font-bold text-pink-text hover:text-sun-text"
            >
                Kelola Booking
                <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                </svg>
            </a>
        </div>
        <div
            class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
            <StatCard
                label="Total"
                value={stats.bookings.total}
                href="/admin/bookings"
                color="pink"
            />
            <StatCard
                label="Pending"
                value={stats.bookings.pending_payment}
                href="/admin/bookings?status=pending_payment"
                color="sun"
            />
            <StatCard
                label="Verifikasi"
                value={stats.bookings.payment_verified}
                href="/admin/bookings?status=payment_verified"
                color="blue"
            />
            <StatCard
                label="Konfirmasi"
                value={stats.bookings.confirmed}
                href="/admin/bookings?status=confirmed"
                color="green"
            />
            <StatCard
                label="Selesai"
                value={stats.bookings.completed}
                href="/admin/bookings?status=completed"
                color="gray"
            />
            <StatCard
                label="Batal"
                value={stats.bookings.cancelled}
                href="/admin/bookings?status=cancelled"
                color="red"
            />
        </div>
    </div>

    <!-- TRIP -->
    <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-lg font-extrabold text-dark">Trip</h2>
                {#if stats.trips.needs_mitra > 0}
                    <span
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200"
                    >
                        <svg
                            class="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="3"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                        {stats.trips.needs_mitra} belum punya mitra
                    </span>
                {/if}
            </div>
            <a
                href="/admin/trips"
                use:inertia
                class="inline-flex items-center gap-1.5 text-xs font-bold text-pink-text hover:text-sun-text"
            >
                Kelola Trip
                <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                </svg>
            </a>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard
                label="Total"
                value={stats.trips.total}
                href="/admin/trips"
                color="pink"
            />
            <StatCard
                label="Terjadwal"
                value={stats.trips.scheduled}
                href="/admin/trips?status=scheduled"
                color="blue"
            />
            <StatCard
                label="Berjalan"
                value={stats.trips.active}
                href="/admin/trips?status=active"
                color="purple"
            />
            <StatCard
                label="Selesai"
                value={stats.trips.completed}
                href="/admin/trips?status=completed"
                color="green"
            />
            <StatCard
                label="Batal"
                value={stats.trips.cancelled}
                href="/admin/trips?status=cancelled"
                color="red"
            />
        </div>
    </div>

    <!-- LAPORAN HARIAN -->
    <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-lg font-extrabold text-dark">
                    Laporan Harian
                </h2>
                {#if stats.daily_reports.submitted > 0}
                    <span
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sun/10 text-sun-text border border-sun/20"
                    >
                        <svg
                            class="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="3"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                        {stats.daily_reports.submitted} menunggu verifikasi
                    </span>
                {/if}
            </div>
            <a
                href="/admin/daily-reports"
                use:inertia
                class="inline-flex items-center gap-1.5 text-xs font-bold text-pink-text hover:text-sun-text"
            >
                Verifikasi Laporan
                <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                </svg>
            </a>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
                label="Total"
                value={stats.daily_reports.total}
                href="/admin/daily-reports"
                color="pink"
            />
            <StatCard
                label="Pending"
                value={stats.daily_reports.submitted}
                href="/admin/daily-reports?status=submitted"
                color="sun"
            />
            <StatCard
                label="Terverifikasi"
                value={stats.daily_reports.verified}
                href="/admin/daily-reports?status=verified"
                color="green"
            />
            <StatCard
                label="Ditolak"
                value={stats.daily_reports.rejected}
                href="/admin/daily-reports?status=rejected"
                color="red"
            />
        </div>
    </div>

    <!-- PAYOUT -->
    <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-lg font-extrabold text-dark">
                    Pencairan Honor
                </h2>
                {#if stats.payouts.pending > 0}
                    <span
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sun/10 text-sun-text border border-sun/20"
                    >
                        <svg
                            class="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="3"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                        {stats.payouts.pending} menunggu review
                    </span>
                {/if}
            </div>
            <a
                href="/admin/payouts"
                use:inertia
                class="inline-flex items-center gap-1.5 text-xs font-bold text-pink-text hover:text-sun-text"
            >
                Kelola Payout
                <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                </svg>
            </a>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
                label="Total"
                value={stats.payouts.total}
                href="/admin/payouts"
                color="pink"
            />
            <StatCard
                label="Pending"
                value={stats.payouts.pending}
                href="/admin/payouts?status=pending"
                color="sun"
            />
            <StatCard
                label="Approved"
                value={stats.payouts.approved}
                href="/admin/payouts?status=approved"
                color="blue"
            />
            <StatCard
                label="Paid"
                value={stats.payouts.paid}
                href="/admin/payouts?status=paid"
                color="green"
            />
        </div>
    </div>

    <!-- PAKET WISATA -->
    <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-extrabold text-dark">
                Paket Wisata
            </h2>
            <a
                href="/admin/packages"
                use:inertia
                class="inline-flex items-center gap-1.5 text-xs font-bold text-pink-text hover:text-sun-text"
            >
                Kelola Paket
                <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                </svg>
            </a>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
                label="Total"
                value={stats.packages.total}
                href="/admin/packages"
                color="pink"
            />
            <StatCard
                label="Draft"
                value={stats.packages.draft}
                href="/admin/packages?status=draft"
                color="gray"
            />
            <StatCard
                label="Aktif"
                value={stats.packages.aktif}
                href="/admin/packages?status=aktif"
                color="green"
            />
            <StatCard
                label="Arsip"
                value={stats.packages.arsip}
                href="/admin/packages?status=arsip"
                color="sun"
            />
        </div>
    </div>

    <!-- PENGGUNA -->
    <div class="mb-6">
        <h2 class="text-lg font-extrabold text-dark mb-3">Pengguna</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
                label="Admin"
                value={stats.totalAdmin}
                color="purple"
            />
            <StatCard
                label="Mitra"
                value={stats.totalMitra}
                color="blue"
            />
            <StatCard
                label="Client"
                value={stats.totalClient}
                color="green"
            />
        </div>
    </div>

    <div
        class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
    >
        <h2 class="text-lg font-bold text-dark mb-2">
            Panel Kontrol Sistem
        </h2>
        <p class="text-sm text-gray-600 leading-relaxed">
            Gunakan menu di sidebar untuk mengelola semua modul
            Titiktemu.
        </p>
    </div>
</DashboardLayout>