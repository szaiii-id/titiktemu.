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
    import { mitraMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type PayoutItem = Pick<
        Payout,
        | 'id'
        | 'kode'
        | 'jumlah'
        | 'bank_tujuan'
        | 'no_rekening'
        | 'nama_pemilik'
        | 'status'
        | 'requested_at'
        | 'reviewed_at'
        | 'paid_at'
        | 'rejection_reason'
    > & {
        reviewer: Pick<UserMini, 'id' | 'name'> | null;
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
            '/mitra/payouts',
            { search, status: selectedStatus },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    function handleSearch(value: string) {
        search = value;
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
            '/mitra/payouts',
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

    const payoutStatusKeys: PayoutStatus[] = [
        'pending',
        'approved',
        'paid',
        'rejected',
    ];

    let statusTabs: StatusTab[] = $derived([
        { value: '', label: 'Semua', count: totalAll },
        ...payoutStatusKeys.map((s) => ({
            value: s,
            label: payoutStatusLabel(s),
            count: statusCounts[s] ?? 0,
        })),
    ]);
</script>

<svelte:head><title>Pencairan | Titiktemu</title></svelte:head>

<DashboardLayout title="Pencairan" menuItems={mitraMenu}>
    <PageHeader
        title="Pencairan Honor"
        description="Riwayat pengajuan pencairan saldo Anda"
    >
        {#snippet actions()}
            <a
                href="/mitra/payouts/create"
                use:inertia
                class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
                <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                    aria-hidden="true"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 4v16m8-8H4"
                    />
                </svg>
                Ajukan Pencairan
            </a>
        {/snippet}
    </PageHeader>

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
                placeholder="Cari kode pencairan..."
            />
        </div>

        <!-- List / Empty -->
        {#if payouts.data.length === 0}
            <EmptyState
                icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                title={hasActiveFilters
                    ? 'Tidak ada pengajuan ditemukan'
                    : 'Belum ada pengajuan'}
                description={hasActiveFilters
                    ? 'Coba ubah filter atau kata kunci pencarian Anda.'
                    : 'Anda belum pernah mengajukan pencairan. Klik tombol di atas untuk mulai.'}
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
                                <p
                                    class="text-lg font-extrabold text-dark"
                                >
                                    {formatCurrency(p.jumlah)}
                                </p>
                                <p
                                    class="text-xs text-gray-500 mt-0.5"
                                >
                                    Ke: {p.bank_tujuan} — {p.no_rekening}
                                    ({p.nama_pemilik})
                                </p>
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
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Pagination -->
            <Pagination meta={payouts} label="pencairan" />
        {/if}
    </div>
</DashboardLayout>