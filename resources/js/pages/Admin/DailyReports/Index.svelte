<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import ConfirmModal from '@/global/ConfirmModal.svelte';
    import EmptyState from '@/global/EmptyState.svelte';
    import FilterBar from '@/global/FilterBar.svelte';
    import Pagination from '@/global/Pagination.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
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
    import { adminMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type ReportItem = DailyReport & {
        trip_day:
            | (TripDay & {
                  trip:
                      | (Trip & {
                            package?: {
                                id: number;
                                nama: string;
                                kode: string;
                            } | null;
                        })
                      | null;
              })
            | null;
        mitra: UserMini | null;
        verifier: UserMini | null;
    };

    let {
        reports,
        filters = {
            search: '',
            status: '',
            sort: 'submitted_at',
            direction: 'desc',
        },
        statusCounts = { submitted: 0, verified: 0, rejected: 0 },
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
        router.get('/admin/daily-reports', buildQuery(), {
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

    function clearFilters() {
        search = '';
        selectedStatus = '';
        clearTimeout(searchTimeout);
        router.get(
            '/admin/daily-reports',
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    let hasActiveFilters = $derived(search !== '' || selectedStatus !== '');

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
                (s) => statusCounts[s] > 0 || selectedStatus === s,
            )
            .map((s) => ({
                value: s,
                label: dailyReportStatusShort(s),
                count: statusCounts[s] ?? 0,
            })),
    ]);

    // ==========================================
    // MODAL — VERIFY
    // ==========================================

    let showVerifyModal = $state(false);
    let reportToVerify = $state<ReportItem | null>(null);
    let verifyProcessing = $state(false);

    function openVerifyModal(report: ReportItem) {
        reportToVerify = report;
        showVerifyModal = true;
    }

    function confirmVerify() {
        if (!reportToVerify) return;
        verifyProcessing = true;

        router.post(
            `/admin/daily-reports/${reportToVerify.id}/verify`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    verifyProcessing = false;
                    showVerifyModal = false;
                    reportToVerify = null;
                },
            },
        );
    }

    // ==========================================
    // MODAL — REJECT
    // ==========================================

    let showRejectModal = $state(false);
    let reportToReject = $state<ReportItem | null>(null);
    let rejectReason = $state('');
    let rejectErrors = $state<Record<string, string>>({});
    let rejectProcessing = $state(false);

    function openRejectModal(report: ReportItem) {
        reportToReject = report;
        rejectReason = '';
        rejectErrors = {};
        showRejectModal = true;
    }

    function confirmReject() {
        if (!reportToReject) return;
        rejectProcessing = true;
        rejectErrors = {};

        router.post(
            `/admin/daily-reports/${reportToReject.id}/reject`,
            { reason: rejectReason },
            {
                preserveScroll: true,
                onError: (err) => {
                    rejectErrors = err as Record<string, string>;
                    rejectProcessing = false;
                },
                onSuccess: () => {
                    showRejectModal = false;
                    rejectProcessing = false;
                    reportToReject = null;
                },
                onFinish: () => {
                    rejectProcessing = false;
                },
            },
        );
    }

    // ==========================================
    // MODAL — VIEW PHOTO
    // ==========================================

    let showPhotoModal = $state(false);
    let photoToView = $state<string | null>(null);
    let photoDialogEl = $state<HTMLDivElement | null>(null);

    function openPhotoModal(path: string) {
        photoToView = `/storage/${path}`;
        showPhotoModal = true;
        // Fokus ke dialog setelah render
        requestAnimationFrame(() => {
            photoDialogEl?.focus();
        });
    }

    function closePhotoModal() {
        showPhotoModal = false;
        photoToView = null;
    }

    function handlePhotoKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            closePhotoModal();
        }
    }
</script>

<svelte:head>
    <title>Laporan Harian — Admin | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Laporan Harian" menuItems={adminMenu}>
    <PageHeader
        title="Verifikasi Laporan"
        description="Verifikasi atau tolak laporan harian yang dikirim mitra"
    />

    <!-- Card -->
    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
    >
        <!-- FilterBar -->
        <FilterBar
            bind:search
            onSearch={handleSearch}
            searchPlaceholder="Cari kode trip, paket, atau nama mitra..."
            statusTabs={statusTabs}
            bind:selectedStatus
            onStatusChange={changeStatus}
            onClear={clearFilters}
            {hasActiveFilters}
        />

        <!-- List / Empty -->
        {#if reports.data.length === 0}
            <EmptyState
                icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                title={hasActiveFilters
                    ? 'Tidak ada laporan ditemukan'
                    : 'Belum ada laporan'}
                description={hasActiveFilters
                    ? 'Coba ubah filter atau kata kunci pencarian Anda.'
                    : 'Laporan harian dari mitra akan muncul di sini.'}
                hasFilters={hasActiveFilters}
                onClear={clearFilters}
            />
        {:else}
            <div class="divide-y divide-gray-100">
                {#each reports.data as report (report.id)}
                    <div
                        class="p-5 hover:bg-gray-50/50 transition-colors"
                    >
                        <div
                            class="flex flex-col lg:flex-row gap-4"
                        >
                            <!-- Thumbnail foto -->
                            <div class="flex gap-2 flex-shrink-0">
                                {#if report.media && report.media.length > 0}
                                    {#each report.media.slice(0, 2) as media (media.id)}
                                        <button
                                            type="button"
                                            onclick={() =>
                                                openPhotoModal(media.path)}
                                            class="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:ring-2 hover:ring-pink transition-all"
                                            aria-label="Lihat foto bukti"
                                        >
                                            <img
                                                src={`/storage/${media.path}`}
                                                alt="Foto bukti"
                                                class="w-full h-full object-cover"
                                            />
                                        </button>
                                    {/each}
                                {:else}
                                    <div
                                        class="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center"
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
                                        <a
                                            href={`/admin/trips/${report.trip_day.trip.id}`}
                                            use:inertia
                                            class="text-[10px] font-mono text-blue hover:text-blue-text transition-colors"
                                        >
                                            {report.trip_day.trip.kode}
                                        </a>
                                    {/if}
                                </div>

                                <h3
                                    class="text-sm font-extrabold text-dark"
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

                                <!-- Mitra info -->
                                {#if report.mitra}
                                    <div
                                        class="mt-2 flex items-center gap-2"
                                    >
                                        <div
                                            class="w-6 h-6 rounded-full bg-gradient-to-br from-pink-dark to-purple text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0"
                                        >
                                            {report.mitra.name
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                        <span
                                            class="text-xs text-gray-600"
                                        >
                                            Oleh
                                            <strong class="text-dark"
                                                >{report.mitra.name}</strong
                                            >
                                        </span>
                                    </div>
                                {/if}

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
                                        <strong>Alasan ditolak:</strong>
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

                            <!-- Aksi -->
                            <div
                                class="flex-shrink-0 flex flex-row lg:flex-col gap-2 self-start lg:self-center"
                            >
                                {#if report.status === 'submitted'}
                                    <button
                                        type="button"
                                        onclick={() =>
                                            openVerifyModal(report)}
                                        class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-green-dark hover:bg-green transition-all shadow-md"
                                        aria-label="Verifikasi"
                                    >
                                        <svg
                                            class="w-3.5 h-3.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            stroke-width="2.5"
                                            aria-hidden="true"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                        Verifikasi
                                    </button>
                                    <button
                                        type="button"
                                        onclick={() =>
                                            openRejectModal(report)}
                                        class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 transition-all"
                                        aria-label="Tolak"
                                    >
                                        <svg
                                            class="w-3.5 h-3.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            stroke-width="2.5"
                                            aria-hidden="true"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                        Tolak
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Pagination -->
            <Pagination meta={reports} label="laporan" />
        {/if}
    </div>
</DashboardLayout>

<!-- ==========================================
     MODAL: VERIFY
========================================== -->
<ConfirmModal
    bind:open={showVerifyModal}
    variant="success"
    title="Verifikasi Laporan?"
    description={`Laporan dari ${reportToVerify?.mitra?.name ?? '-'} untuk Hari ${reportToVerify?.trip_day?.hari_ke ?? '-'} akan diverifikasi.`}
    confirmLabel="Ya, Verifikasi"
    processing={verifyProcessing}
    onConfirm={confirmVerify}
/>

<!-- ==========================================
     MODAL: REJECT
========================================== -->
<ConfirmModal
    bind:open={showRejectModal}
    variant="danger"
    title="Tolak Laporan?"
    description={`Laporan dari ${reportToReject?.mitra?.name ?? '-'} akan ditolak. Mitra harus upload ulang.`}
    confirmLabel="Ya, Tolak"
    requiresReason
    reasonLabel="Alasan Penolakan"
    reasonPlaceholder="Contoh: Foto kurang jelas, tolong upload ulang"
    bind:reasonValue={rejectReason}
    reasonError={rejectErrors.reason}
    processing={rejectProcessing}
    onConfirm={confirmReject}
/>

<!-- ==========================================
     MODAL: VIEW PHOTO
     - role="dialog" + tabindex="-1" (a11y)
     - klik background (button) → close
     - Escape → close
     - img TANPA onclick (non-interactive)
========================================== -->
{#if showPhotoModal && photoToView}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
    >
        <!-- Overlay klik → close (pakai button fullscreen, bukan div onclick) -->
        <button
            type="button"
            class="absolute inset-0 cursor-default"
            aria-label="Tutup pratinjau foto"
            onclick={closePhotoModal}
        ></button>

        <!-- Dialog konten -->
        <div
            bind:this={photoDialogEl}
            role="dialog"
            aria-modal="true"
            aria-label="Pratinjau foto bukti"
            tabindex="-1"
            onkeydown={handlePhotoKeydown}
            class="relative max-w-full max-h-full focus:outline-none"
        >
            <!-- Tombol close -->
            <button
                type="button"
                onclick={closePhotoModal}
                class="absolute -top-2 -right-2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                aria-label="Tutup"
            >
                <svg
                    class="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                    aria-hidden="true"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>

            <!-- Foto -->
            <img
                src={photoToView}
                alt="Foto bukti"
                class="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
        </div>
    </div>
{/if}