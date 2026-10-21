<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import EmptyState from '@/global/EmptyState.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import Pagination from '@/global/Pagination.svelte';
    import SearchInput from '@/global/SearchInput.svelte';
    import StatusTabs from '@/global/StatusTabs.svelte';
    import { inertia, router } from '@inertiajs/svelte';
    import type {
        DailyReport,
        DailyReportStatus,
        PaginationMeta,
        StatusTab,
        Trip,
        TripDay,
        UserMini,
    } from '@/types';
    import {
        dailyReportStatusBadge,
        dailyReportStatusLabel,
        dailyReportStatusShort,
    } from '@/utils/enums';
    import { formatDateTime } from '@/utils/formatDate';
    import { mitraMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type ReportItem = Omit<
        DailyReport,
        'trip_day' | 'mitra' | 'verifier' | 'media'
    > & {
        trip_day:
            | (TripDay & {
                trip:
                    | (Trip & {
                            package: {
                                id: number;
                                nama: string;
                                kode: string;
                            } | null;
                        })
                    | null;
            })
            | null;
        mitra: Pick<UserMini, 'id' | 'name' | 'email'> | null;
        verifier: Pick<UserMini, 'id' | 'name' | 'email'> | null;
        media: Array<{
            id: number;
            path: string;
            urutan: number;
        }>;
    };

    let {
        reports,
        filters = {
            search: '',
            status: '',
            sort: 'submitted_at',
            direction: 'desc',
        },
        statusCounts = {
            submitted: 0,
            verified: 0,
            rejected: 0,
        },
    }: {
        reports: PaginationMeta & { data: ReportItem[] };
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
        router.get('/mitra/daily-reports', buildQuery(), {
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
            '/mitra/daily-reports',
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

    const dailyReportStatusKeys: DailyReportStatus[] = [
        'submitted',
        'verified',
        'rejected',
    ];

    let statusTabs: StatusTab[] = $derived([
        { value: '', label: 'Semua', count: totalAll },
        ...dailyReportStatusKeys
            .filter(
                (s) =>
                    statusCounts[s] > 0 || selectedStatus === s,
            )
            .map((s) => ({
                value: s,
                label: dailyReportStatusShort(s),
                count: statusCounts[s] ?? 0,
            })),
    ]);
</script>

<svelte:head>
    <title>Laporan Harian | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Laporan Harian" menuItems={mitraMenu}>
    <PageHeader
        title="Laporan Harian"
        description="Riwayat laporan harian Anda di semua trip"
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
        {#if reports.data.length === 0}
            <EmptyState
                icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                title={hasActiveFilters
                    ? 'Tidak ada laporan ditemukan'
                    : 'Belum ada laporan'}
                description={hasActiveFilters
                    ? 'Coba ubah filter atau kata kunci pencarian Anda.'
                    : 'Laporan akan muncul di sini setelah Anda submit di trip.'}
                hasFilters={hasActiveFilters}
                onClear={clearFilters}
            />
        {:else}
            <div class="divide-y divide-gray-100">
                {#each reports.data as report (report.id)}
                    <a
                        href={`/mitra/trips/${report.trip_day?.trip?.id ?? '#'}`}
                        use:inertia
                        class="block p-5 hover:bg-gray-50/70 transition-colors group"
                    >
                        <div
                            class="flex flex-col sm:flex-row sm:items-start gap-4"
                        >
                            <!-- Thumbnail foto -->
                            <div class="flex gap-2 shrink-0">
                                {#if report.media.length > 0}
                                    {#each report.media.slice(0, 2) as media (media.id)}
                                        <div
                                            class="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shadow-sm"
                                        >
                                            <img
                                                src={`/storage/${media.path}`}
                                                alt="Foto bukti"
                                                class="w-full h-full object-cover"
                                            />
                                        </div>
                                    {/each}
                                {:else}
                                    <div
                                        class="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center"
                                    >
                                        <svg
                                            class="w-6 h-6 text-gray-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            stroke-width="1.5"
                                            aria-hidden="true"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </div>
                                {/if}
                            </div>

                            <!-- Info -->
                            <div class="flex-1 min-w-0">
                                <div
                                    class="flex flex-wrap items-center gap-2 mb-1"
                                >
                                    <span
                                        class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold {dailyReportStatusBadge(
                                            report.status,
                                        )}"
                                    >
                                        {dailyReportStatusLabel(
                                            report.status,
                                        )}
                                    </span>
                                    {#if report.trip_day?.trip}
                                        <span
                                            class="text-[10px] font-mono text-gray-500"
                                        >
                                            {report.trip_day.trip.kode}
                                        </span>
                                    {/if}
                                </div>

                                <h3
                                    class="text-sm font-extrabold text-dark group-hover:text-pink-text transition-colors"
                                >
                                    {report.trip_day?.trip?.package
                                        ?.nama ?? 'Trip'}
                                </h3>

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
                                        Hari {report.trip_day?.hari_ke} — {report
                                            .trip_day?.judul}
                                    </span>
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
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        {formatDateTime(
                                            report.submitted_at,
                                        )}
                                    </span>
                                </div>

                                {#if report.catatan}
                                    <p
                                        class="text-xs text-gray-600 mt-2 line-clamp-2"
                                    >
                                        {report.catatan}
                                    </p>
                                {/if}

                                {#if report.status === 'rejected' && report.rejection_reason}
                                    <div
                                        class="mt-2 p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700"
                                    >
                                        <strong>Ditolak:</strong>
                                        {report.rejection_reason}
                                    </div>
                                {/if}

                                {#if report.status === 'verified' && report.verifier}
                                    <p
                                        class="text-[11px] text-gray-500 mt-1"
                                    >
                                        Diverifikasi oleh {report.verifier
                                            .name} pada {formatDateTime(
                                            report.verified_at,
                                        )}
                                    </p>
                                {/if}
                            </div>

                            <!-- Arrow -->
                            <div class="shrink-0 self-center">
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
            <Pagination meta={reports} label="laporan" />
        {/if}
    </div>
</DashboardLayout>