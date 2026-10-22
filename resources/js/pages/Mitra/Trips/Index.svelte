<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import EmptyState from '@/global/EmptyState.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import Pagination from '@/global/Pagination.svelte';
    import SearchInput from '@/global/SearchInput.svelte';
    import StatusTabs from '@/global/StatusTabs.svelte';
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
    import { mitraMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type TripItem = Pick<
        Trip,
        | 'id'
        | 'kode'
        | 'tanggal_mulai'
        | 'tanggal_selesai'
        | 'jumlah_peserta'
        | 'timezone'
        | 'status'
    > & {
        mitras_count: number;
        package: {
            id: number;
            nama: string;
            kode: string;
            timezone: string;
        } | null;
        booking: {
            id: number;
            kode: string;
            client: {
                id: number;
                name: string;
                email: string;
            } | null;
        } | null;
    };

    let {
        trips,
        filters = {
            search: '',
            status: '',
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
        trips: PaginationMeta & { data: TripItem[] };
        filters: {
            search: string;
            status: string;
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
    let searchTimeout: ReturnType<typeof setTimeout>;

    // ==========================================
    // FILTER HANDLERS
    // ==========================================

    function buildQuery() {
        return {
            search,
            status: selectedStatus,
            sort: filters.sort,
            direction: filters.direction,
        };
    }

    function navigate(): void {
        router.get('/mitra/trips', buildQuery(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function handleSearch(value: string) {
        search = value;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(navigate, 300);
    }

    function changeStatus(status: string) {
        selectedStatus = status;
        navigate();
    }

    function clearFilters() {
        search = '';
        selectedStatus = '';
        clearTimeout(searchTimeout);
        router.get(
            '/mitra/trips',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    let hasActiveFilters = $derived(
        search !== '' || selectedStatus !== '',
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
                (s) =>
                    statusCounts[s] > 0 || selectedStatus === s,
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
     * Cek apakah trip sedang berjalan hari ini (timezone-aware).
     *
     * PRD §9.6: "hari ini" dihitung di trip.timezone.
     */
    function isTripToday(trip: TripItem): boolean {
        const today = todayInTimezone(trip.timezone);
        return isDateInRange(
            today,
            trip.tanggal_mulai,
            trip.tanggal_selesai,
        );
    }
</script>

<svelte:head>
    <title>Trip Saya | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Trip Saya" menuItems={mitraMenu}>
    <PageHeader
        title="Trip Saya"
        description="Daftar trip yang Anda ikuti sebagai mitra"
    />

    <!-- Card -->
    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
    >
        <!-- Toolbar -->
        <div class="p-4 sm:p-6 border-b border-gray-100 space-y-4">
            <StatusTabs
                tabs={statusTabs}
                bind:active={selectedStatus}
                onchange={changeStatus}
            />

            <SearchInput
                bind:value={search}
                oninput={handleSearch}
                placeholder="Cari kode trip atau nama paket..."
            />
        </div>

        <!-- List / Empty -->
        {#if trips.data.length === 0}
            <EmptyState
                icon="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                title={hasActiveFilters
                    ? 'Tidak ada trip ditemukan'
                    : 'Belum ada trip'}
                description={hasActiveFilters
                    ? 'Coba ubah filter atau kata kunci pencarian Anda.'
                    : 'Trip yang Anda ikuti akan muncul di sini setelah di-assign admin.'}
                hasFilters={hasActiveFilters}
                onClear={clearFilters}
            />
        {:else}
            <div class="space-y-3 p-4 sm:p-6">
                {#each trips.data as trip (trip.id)}
                    <a
                        href={`/mitra/trips/${trip.id}`}
                        use:inertia
                        class="group block bg-white border border-gray-200 rounded-2xl p-4 hover:border-pink/30 hover:shadow-md transition-all"
                    >
                        <div
                            class="flex flex-col sm:flex-row sm:items-center gap-4"
                        >
                            <div
                                class="flex items-start gap-3 flex-1 min-w-0"
                            >
                                <div
                                    class="w-12 h-12 rounded-2xl bg-linear-to-br from-pink-dark to-purple flex items-center justify-center text-white font-extrabold text-lg shadow-md shrink-0"
                                >
                                    {trip.package?.nama
                                        ?.charAt(0)
                                        ?.toUpperCase() ?? '?'}
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div
                                        class="flex flex-wrap items-center gap-2 mb-1"
                                    >
                                        <span
                                            class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold {tripStatusBadge(
                                                trip.status,
                                            )}"
                                        >
                                            {tripStatusLabel(
                                                trip.status,
                                            )}
                                        </span>
                                        {#if isTripToday(trip) && trip.status === 'active'}
                                            <span
                                                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple/10 text-purple-text border border-purple/20"
                                            >
                                                <span
                                                    class="w-1.5 h-1.5 rounded-full bg-purple animate-pulse"
                                                ></span>
                                                Hari ini
                                            </span>
                                        {/if}
                                    </div>
                                    <h3
                                        class="text-sm font-extrabold text-dark truncate group-hover:text-pink-text transition-colors"
                                    >
                                        {trip.package?.nama ?? 'Trip'}
                                    </h3>
                                    <p
                                        class="text-[11px] text-gray-500 font-mono mt-0.5"
                                    >
                                        {trip.kode}
                                    </p>
                                    <div
                                        class="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1"
                                    >
                                        <span
                                            class="inline-flex items-center gap-1"
                                        >
                                            <svg
                                                class="w-3 h-3"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                stroke-width="2.5"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                            {formatDate(
                                                trip.tanggal_mulai,
                                            )}
                                        </span>
                                        <span
                                            >{formatDurasiFromRange(
                                                trip.tanggal_mulai,
                                                trip.tanggal_selesai,
                                            )}</span
                                        >
                                        <span
                                            >{trip.jumlah_peserta}
                                            peserta</span
                                        >
                                    </div>
                                </div>
                            </div>
                            <div
                                class="shrink-0 self-end sm:self-center"
                            >
                                <div
                                    class="w-8 h-8 rounded-full bg-pink-dark/10 text-pink-text flex items-center justify-center group-hover:bg-pink-dark group-hover:text-white transition-all"
                                    aria-hidden="true"
                                >
                                    <svg
                                        class="w-4 h-4"
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
                                </div>
                            </div>
                        </div>
                    </a>
                {/each}
            </div>

            <!-- Pagination -->
            <Pagination meta={trips} label="trip" />
        {/if}
    </div>
</DashboardLayout>