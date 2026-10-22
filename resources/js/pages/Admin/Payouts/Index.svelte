<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import ConfirmModal from '@/global/ConfirmModal.svelte';
    import EmptyState from '@/global/EmptyState.svelte';
    import FilterBar from '@/global/FilterBar.svelte';
    import Pagination from '@/global/Pagination.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import { router } from '@inertiajs/svelte';
    import type {
        PaginationMeta,
        Payout,
        PayoutStatus,
        StatusTab,
        UserMini,
    } from '@/types';
    import {
        payoutStatusBadge,
        payoutStatusLabel,
    } from '@/utils/enums';
    import { formatCurrency } from '@/utils/formatCurrency';
    import { formatDateTime } from '@/utils/formatDate';
    import { adminMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type PayoutItem = Payout & {
        mitra: UserMini | null;
        reviewer: UserMini | null;
    };

    let {
        payouts,
        filters = { search: '', status: '' },
        statusCounts = {
            pending: 0,
            approved: 0,
            paid: 0,
            rejected: 0,
        },
    }: {
        payouts: PaginationMeta & { data: PayoutItem[] };
        filters: { search: string; status: string };
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

    function navigate(): void {
        router.get(
            '/admin/payouts',
            { search, status: selectedStatus },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function handleSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(navigate, 300);
    }

    function changeStatus(s: string) {
        selectedStatus = s;
        navigate();
    }

    function clearFilters() {
        search = '';
        selectedStatus = '';
        clearTimeout(searchTimeout);
        router.get(
            '/admin/payouts',
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

    const payoutStatusKeys: PayoutStatus[] = [
        'pending',
        'approved',
        'paid',
        'rejected',
    ];

    let statusTabs: StatusTab[] = $derived([
        { value: '', label: 'Semua', count: totalAll },
        ...payoutStatusKeys
            .filter(
                (s) => statusCounts[s] > 0 || selectedStatus === s,
            )
            .map((s) => ({
                value: s,
                label: payoutStatusLabel(s),
                count: statusCounts[s] ?? 0,
            })),
    ]);

    // ==========================================
    // MODAL — APPROVE
    // ==========================================

    let showApproveModal = $state(false);
    let payoutToApprove = $state<PayoutItem | null>(null);
    let approveProcessing = $state(false);

    function openApprove(p: PayoutItem) {
        payoutToApprove = p;
        showApproveModal = true;
    }

    function confirmApprove() {
        if (!payoutToApprove) return;
        approveProcessing = true;
        router.post(
            `/admin/payouts/${payoutToApprove.id}/approve`,
            {},
            {
                onFinish: () => {
                    approveProcessing = false;
                    showApproveModal = false;
                    payoutToApprove = null;
                },
            },
        );
    }

    // ==========================================
    // MODAL — REJECT
    // ==========================================

    let showRejectModal = $state(false);
    let payoutToReject = $state<PayoutItem | null>(null);
    let rejectReason = $state('');
    let rejectErrors = $state<Record<string, string>>({});
    let rejectProcessing = $state(false);

    function openReject(p: PayoutItem) {
        payoutToReject = p;
        rejectReason = '';
        rejectErrors = {};
        showRejectModal = true;
    }

    function confirmReject() {
        if (!payoutToReject) return;
        rejectProcessing = true;
        rejectErrors = {};
        router.post(
            `/admin/payouts/${payoutToReject.id}/reject`,
            { reason: rejectReason },
            {
                onError: (err) => {
                    rejectErrors = err as Record<string, string>;
                    rejectProcessing = false;
                },
                onSuccess: () => {
                    showRejectModal = false;
                    rejectProcessing = false;
                    payoutToReject = null;
                },
                onFinish: () => {
                    rejectProcessing = false;
                },
            },
        );
    }

    // ==========================================
    // MODAL — PAID
    // ==========================================

    let showPaidModal = $state(false);
    let payoutToPaid = $state<PayoutItem | null>(null);
    let paidProcessing = $state(false);

    function openPaid(p: PayoutItem) {
        payoutToPaid = p;
        showPaidModal = true;
    }

    function confirmPaid() {
        if (!payoutToPaid) return;
        paidProcessing = true;
        router.post(
            `/admin/payouts/${payoutToPaid.id}/mark-paid`,
            {},
            {
                onFinish: () => {
                    paidProcessing = false;
                    showPaidModal = false;
                    payoutToPaid = null;
                },
            },
        );
    }
</script>


<svelte:head><title>Payout | Titiktemu</title></svelte:head>

<DashboardLayout title="Payout" menuItems={adminMenu}>
    <PageHeader
        title="Pencairan Honor"
        description="Review dan proses pengajuan pencairan dari mitra"
    />

    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
    >
        <!-- FilterBar -->
        <FilterBar
            bind:search
            onSearch={handleSearch}
            searchPlaceholder="Cari kode atau nama pemilik..."
            statusTabs={statusTabs}
            bind:selectedStatus
            onStatusChange={changeStatus}
            onClear={clearFilters}
            {hasActiveFilters}
        />

        <!-- List / Empty -->
        {#if payouts.data.length === 0}
            <EmptyState
                icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                title={hasActiveFilters
                    ? 'Tidak ada pengajuan ditemukan'
                    : 'Belum ada pengajuan'}
                description={hasActiveFilters
                    ? 'Coba ubah filter atau kata kunci pencarian Anda.'
                    : 'Pengajuan pencairan dari mitra akan muncul di sini.'}
                hasFilters={hasActiveFilters}
                onClear={clearFilters}
            />
        {:else}
            <div class="divide-y divide-gray-100">
                {#each payouts.data as p (p.id)}
                    <div class="p-5 hover:bg-gray-50/50">
                        <div class="flex flex-col lg:flex-row gap-4">
                            <div class="flex-1 min-w-0">
                                <div
                                    class="flex flex-wrap items-center gap-2 mb-1"
                                >
                                    <span
                                        class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold {payoutStatusBadge(
                                            p.status,
                                        )}"
                                    >
                                        {payoutStatusLabel(p.status)}
                                    </span>
                                    <span
                                        class="text-[10px] font-mono text-gray-500"
                                        >{p.kode}</span
                                    >
                                </div>
                                <p class="text-lg font-extrabold text-dark">
                                    {formatCurrency(p.jumlah)}
                                </p>
                                <p class="text-xs text-gray-500 mt-0.5">
                                    {p.bank_tujuan} — {p.no_rekening} —
                                    {p.nama_pemilik}
                                </p>
                                {#if p.mitra}
                                    <div
                                        class="flex items-center gap-2 mt-2"
                                    >
                                        <div
                                            class="w-6 h-6 rounded-full bg-gradient-to-br from-pink-dark to-purple text-white flex items-center justify-center font-bold text-[10px]"
                                        >
                                            {p.mitra.name
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                        <span
                                            class="text-xs text-gray-600"
                                        >
                                            Oleh
                                            <strong class="text-dark"
                                                >{p.mitra.name}</strong
                                            >
                                        </span>
                                    </div>
                                {/if}
                                <p
                                    class="text-[11px] text-gray-400 mt-1"
                                >
                                    Diminta {formatDateTime(
                                        p.requested_at,
                                    )}
                                </p>
                                {#if p.rejection_reason}
                                    <p
                                        class="text-xs text-red-700 mt-2 p-2 bg-red-50 rounded-lg"
                                    >
                                        <strong>Ditolak:</strong>
                                        {p.rejection_reason}
                                    </p>
                                {/if}
                                {#if p.paid_at}
                                    <p
                                        class="text-[11px] text-green-text mt-1 font-bold"
                                    >
                                        Ditransfer {formatDateTime(
                                            p.paid_at,
                                        )}
                                    </p>
                                {/if}
                            </div>
                            <div
                                class="flex flex-row lg:flex-col gap-2 self-start lg:self-center flex-shrink-0"
                            >
                                {#if p.status === 'pending'}
                                    <button
                                        type="button"
                                        onclick={() => openApprove(p)}
                                        class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-green-dark hover:bg-green shadow-md"
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
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                        Approve
                                    </button>
                                    <button
                                        type="button"
                                        onclick={() => openReject(p)}
                                        class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100"
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
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                        Tolak
                                    </button>
                                {:else if p.status === 'approved'}
                                    <button
                                        type="button"
                                        onclick={() => openPaid(p)}
                                        class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-pink-dark hover:bg-sun-dark shadow-md"
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
                                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                            />
                                        </svg>
                                        Tandai Ditransfer
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Pagination -->
            <Pagination meta={payouts} label="payout" />
        {/if}
    </div>
</DashboardLayout>

<!-- ==========================================
     MODAL: APPROVE
========================================== -->
<ConfirmModal
    bind:open={showApproveModal}
    variant="success"
    title="Setujui Payout?"
    description={`Payout ${payoutToApprove?.kode ?? '-'} sebesar ${formatCurrency(payoutToApprove?.jumlah ?? 0)} akan disetujui dan saldo mitra didebit.`}
    confirmLabel="Ya, Setujui"
    processing={approveProcessing}
    onConfirm={confirmApprove}
/>

<!-- ==========================================
     MODAL: REJECT
========================================== -->
<ConfirmModal
    bind:open={showRejectModal}
    variant="danger"
    title="Tolak Payout?"
    description={`Payout ${payoutToReject?.kode ?? '-'} akan ditolak.`}
    confirmLabel="Ya, Tolak"
    requiresReason
    reasonLabel="Alasan"
    reasonPlaceholder="Contoh: Data rekening tidak valid"
    bind:reasonValue={rejectReason}
    reasonError={rejectErrors.reason}
    processing={rejectProcessing}
    onConfirm={confirmReject}
/>

<!-- ==========================================
     MODAL: PAID
========================================== -->
<ConfirmModal
    bind:open={showPaidModal}
    variant="info"
    title="Tandai Sudah Ditransfer?"
    description={`Pastikan Anda sudah mentransfer ${formatCurrency(payoutToPaid?.jumlah ?? 0)} ke rekening mitra.`}
    confirmLabel="Ya, Tandai"
    processing={paidProcessing}
    onConfirm={confirmPaid}
/>