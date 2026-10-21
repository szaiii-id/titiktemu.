<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import EmptyState from '@/global/EmptyState.svelte';
    import FilterBar from '@/global/FilterBar.svelte';
    import Pagination from '@/global/Pagination.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import { inertia, router } from '@inertiajs/svelte';
    import type {
        PaginationMeta,
        StatusTab,
        Trip,
        TripStatus,
    } from '@/types';
    import {
        tripStatusBadge,
        tripStatusLabel,
        tripStatusShort,
    } from '@/utils/enums';
    import { formatDate } from '@/utils/formatDate';
    import { formatDurasiFromRange } from '@/utils/duration';
    import { isDateInRange, todayInTimezone } from '@/utils/timezone';
    import { adminMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        trips,
        filters = {
            search: '',
            status: '',
            tanggal_dari: '',
            tanggal_sampai: '',
            sort: 'tanggal_mulai',
            direction: 'desc',
        },
        statusCounts = {
            scheduled: 0,
            active: 0,
            completed: 0,
            cancelled: 0,
        },
    }: {
        trips: PaginationMeta & {
            data: Array<
                Trip & {
                    mitras_count: number;
                    package?: {
                        id: number;
                        nama: string;
                        kode: string;
                        timezone: string;
                    } | null;
                    booking?: {
                        id: number;
                        kode: string;
                        client?: {
                            id: number;
                            name: string;
                            email: string;
                        } | null;
                    } | null;
                }
            >;
        };
        filters: {
            search: string;
            status: string;
            tanggal_dari: string;
            tanggal_sampai: string;
            sort: string;
            direction: string;
        };
        statusCounts: Record<string, number>;
    } = $props();

    // ==========================================
    // STATE
    // ==========================================

    // Filter state — di-init dari props `filters` (initial value).
    // Setelah user ubah filter → router.get() → Inertia reload → komponen
    // re-mount → state re-init dari filters baru. Jadi tidak perlu sync.
    // svelte-ignore state_referenced_locally
    let search = $state(filters.search ?? '');
    // svelte-ignore state_referenced_locally
    let selectedStatus = $state(filters.status ?? '');
    // svelte-ignore state_referenced_locally
    let selectedTanggalDari = $state(filters.tanggal_dari ?? '');
    // svelte-ignore state_referenced_locally
    let selectedTanggalSampai = $state(filters.tanggal_sampai ?? '');
    let searchTimeout: ReturnType<typeof setTimeout>;

    // ==========================================
    // FILTER HANDLERS
    // ==========================================

    function buildQuery() {
        return {
            search,
            status: selectedStatus,
            tanggal_dari: selectedTanggalDari,
            tanggal_sampai: selectedTanggalSampai,
            sort: filters.sort,
            direction: filters.direction,
        };
    }

    function navigate(): void {
        router.get('/admin/trips', buildQuery(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function handleSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(navigate, 300);
    }

    function changeStatus(status: string) {
        selectedStatus = status;
        navigate();
    }

    function applyAdvancedFilter() {
        navigate();
    }

    function clearFilters() {
        search = '';
        selectedStatus = '';
        selectedTanggalDari = '';
        selectedTanggalSampai = '';
        clearTimeout(searchTimeout);
        router.get(
            '/admin/trips',
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    let hasActiveFilters = $derived(
        search !== '' ||
            selectedStatus !== '' ||
            selectedTanggalDari !== '' ||
            selectedTanggalSampai !== '',
    );

    let totalAll = $derived(
        Object.values(statusCounts).reduce((sum, n) => sum + n, 0),
    );

    // ==========================================
    // STATUS TABS
    // ==========================================

    const tripStatusKeys: TripStatus[] = [
        'scheduled',
        'active',
        'completed',
        'cancelled',
    ];

    let statusTabs: StatusTab[] = $derived([
        { value: '', label: 'Semua', count: totalAll },
        ...tripStatusKeys
            .filter(
                (s) => statusCounts[s] > 0 || selectedStatus === s,
            )
            .map((s) => ({
                value: s,
                label: tripStatusShort(s),
                count: statusCounts[s] ?? 0,
            })),
    ]);

    // ==========================================
    // HELPERS — TIMEZONE AWARE
    // ==========================================

    /**
     * Cek apakah trip sedang berjalan hari ini, berdasarkan timezone trip.
     *
     * PRD §9.6: "hari ini" dihitung di trip.timezone, bukan browser.
     */
    function isTripToday(trip: Trip): boolean {
        const tz = trip.timezone;
        const today = todayInTimezone(tz);
        return isDateInRange(today, trip.tanggal_mulai, trip.tanggal_selesai);
    }
</script>

<svelte:head>
    <title>Trip Management | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Trip" menuItems={adminMenu}>
    <PageHeader
        title="Trip Management"
        description="Kelola trip yang sedang berjalan — assign mitra, aktifkan, atau selesaikan."
    />

    <!-- Card -->
    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
    >
        <!-- FilterBar -->
        <FilterBar
            bind:search
            onSearch={handleSearch}
            searchPlaceholder="Cari kode trip, kode booking, paket, atau nama client..."
            statusTabs={statusTabs}
            bind:selectedStatus
            onStatusChange={changeStatus}
            showDateRange
            bind:dateFrom={selectedTanggalDari}
            bind:dateTo={selectedTanggalSampai}
            onApplyDate={applyAdvancedFilter}
            dateFromLabel="Tanggal Mulai Dari"
            dateToLabel="Sampai"
            onClear={clearFilters}
            {hasActiveFilters}
        />

        <!-- List / Empty -->
        {#if trips.data.length === 0}
            <EmptyState
                icon="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                title={hasActiveFilters
                    ? 'Tidak ada trip ditemukan'
                    : 'Belum ada trip'}
                description={hasActiveFilters
                    ? 'Coba ubah filter atau kata kunci pencarian Anda.'
                    : 'Trip akan otomatis dibuat saat booking client dikonfirmasi.'}
                hasFilters={hasActiveFilters}
                onClear={clearFilters}
            />
        {:else}
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead
                        class="bg-gray-50/80 border-b border-gray-200"
                    >
                        <tr>
                            <th
                                class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest"
                            >
                                Trip
                            </th>
                            <th
                                class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest hidden md:table-cell"
                            >
                                Client
                            </th>
                            <th
                                class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest hidden lg:table-cell"
                            >
                                Tanggal
                            </th>
                            <th
                                class="text-center px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest hidden sm:table-cell"
                            >
                                Mitra
                            </th>
                            <th
                                class="text-center px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest"
                            >
                                Status
                            </th>
                            <th
                                class="text-right px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest"
                            >
                                Aksi
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        {#each trips.data as trip (trip.id)}
                            <tr
                                class="group hover:bg-gray-50/70 transition-colors"
                            >
                                <td class="px-6 py-4">
                                    <div
                                        class="flex items-start gap-3"
                                    >
                                        <div
                                            class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple to-pink-dark flex items-center justify-center text-white font-extrabold text-xs shadow-md flex-shrink-0"
                                        >
                                            {trip.package?.nama
                                                ?.charAt(0)
                                                .toUpperCase() ?? '?'}
                                        </div>
                                        <div class="min-w-0">
                                            <p
                                                class="text-xs font-mono text-gray-500 mb-0.5"
                                            >
                                                {trip.kode}
                                            </p>
                                            <p
                                                class="font-bold text-dark truncate"
                                            >
                                                {trip.package?.nama ??
                                                    'Paket dihapus'}
                                            </p>
                                            <p
                                                class="text-[11px] text-gray-500 mt-0.5"
                                            >
                                                {trip.jumlah_peserta} peserta
                                                · {formatDurasiFromRange(
                                                    trip.tanggal_mulai,
                                                    trip.tanggal_selesai,
                                                )}
                                            </p>
                                            {#if isTripToday(
                                                trip,
                                            ) && trip.status === 'active'}
                                                <span
                                                    class="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple/10 text-purple-text border border-purple/20"
                                                >
                                                    <span
                                                        class="w-1.5 h-1.5 rounded-full bg-purple animate-pulse"
                                                    ></span>
                                                    Hari ini
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                </td>
                                <td
                                    class="px-6 py-4 hidden md:table-cell"
                                >
                                    {#if trip.booking?.client}
                                        <div
                                            class="flex items-center gap-3"
                                        >
                                            <div
                                                class="w-8 h-8 rounded-full bg-gradient-to-br from-pink-dark to-purple text-white flex items-center justify-center font-bold text-xs flex-shrink-0"
                                            >
                                                {trip.booking.client.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>
                                            <div class="min-w-0">
                                                <p
                                                    class="font-bold text-dark truncate text-xs"
                                                >
                                                    {trip.booking.client
                                                        .name}
                                                </p>
                                                <p
                                                    class="text-[11px] text-gray-500 truncate"
                                                >
                                                    {trip.booking.client
                                                        .email}
                                                </p>
                                            </div>
                                        </div>
                                    {:else}
                                        <p
                                            class="text-xs text-gray-400 italic"
                                        >
                                            -
                                        </p>
                                    {/if}
                                </td>
                                <td
                                    class="px-6 py-4 hidden lg:table-cell"
                                >
                                    <p
                                        class="text-sm font-medium text-dark"
                                    >
                                        {formatDate(trip.tanggal_mulai)}
                                    </p>
                                    <p
                                        class="text-[11px] text-gray-500 mt-0.5"
                                    >
                                        s/d {formatDate(
                                            trip.tanggal_selesai,
                                        )}
                                    </p>
                                </td>
                                <td
                                    class="px-6 py-4 text-center hidden sm:table-cell"
                                >
                                    {#if trip.mitras_count > 0}
                                        <span
                                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-green/10 text-green-text border border-green/20"
                                        >
                                            <svg
                                                class="w-3 h-3"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                stroke-width="2.5"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                            </svg>
                                            {trip.mitras_count}
                                        </span>
                                    {:else}
                                        <span
                                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-50 text-red-700 border border-red-200"
                                        >
                                            <svg
                                                class="w-3 h-3"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                stroke-width="2.5"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                />
                                            </svg>
                                            Belum ada
                                        </span>
                                    {/if}
                                </td>
                                <td class="px-6 py-4 text-center">
                                    <span
                                        class="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-extrabold {tripStatusBadge(
                                            trip.status,
                                        )}"
                                    >
                                        {tripStatusLabel(trip.status)}
                                    </span>
                                </td>
                                <td class="px-6 py-4">
                                    <div
                                        class="flex items-center justify-end"
                                    >
                                        <a
                                            href={`/admin/trips/${trip.id}`}
                                            use:inertia
                                            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue bg-blue/5 hover:bg-blue/10 transition-all"
                                            aria-label="Lihat detail"
                                        >
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
                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                />
                                            </svg>
                                            Detail
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <Pagination meta={trips} label="trip" />
        {/if}
    </div>
</DashboardLayout>