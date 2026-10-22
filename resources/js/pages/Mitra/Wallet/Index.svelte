<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import EmptyState from '@/global/EmptyState.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import Pagination from '@/global/Pagination.svelte';
    import { inertia } from '@inertiajs/svelte';
    import type {
        MitraWallet,
        PaginationMeta,
        WalletTransaction,
        WalletTransactionKategori,
    } from '@/types';
    import {
        walletTransactionKategoriLabel,
    } from '@/utils/enums';
    import { formatCurrency } from '@/utils/formatCurrency';
    import { formatDateTime } from '@/utils/formatDate';
    import { mitraMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type Wallet = Pick<
        MitraWallet,
        'id' | 'saldo' | 'total_pendapatan' | 'total_dicairkan' | 'updated_at'
    >;

    type TransactionItem = Pick<
        WalletTransaction,
        | 'id'
        | 'tipe'
        | 'jumlah'
        | 'saldo_setelah'
        | 'kategori'
        | 'deskripsi'
        | 'created_at'
    >;

    let {
        wallet,
        transactions,
    }: {
        wallet: Wallet;
        transactions: PaginationMeta & { data: TransactionItem[] };
    } = $props();

    // ==========================================
    // HELPERS
    // ==========================================

    function kategoriLabel(k: string): string {
        return walletTransactionKategoriLabel(k);
    }
</script>

<svelte:head><title>Wallet | Titiktemu</title></svelte:head>

<DashboardLayout title="Wallet" menuItems={mitraMenu}>
    <PageHeader
        title="Wallet Saya"
        description="Saldo honor dan riwayat transaksi"
    />

    <!-- Saldo Card -->
    <div
        class="bg-gradient-to-br from-green-dark to-green rounded-3xl p-8 text-white shadow-xl mb-6"
    >
        <p
            class="text-xs font-extrabold uppercase tracking-widest opacity-80 mb-1"
        >
            Saldo Tersedia
        </p>
        <p class="text-4xl sm:text-5xl font-extrabold mb-4">
            {formatCurrency(wallet.saldo)}
        </p>
        <div
            class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6"
        >
            <div>
                <p
                    class="text-[10px] uppercase tracking-widest opacity-70"
                >
                    Total Pendapatan
                </p>
                <p class="text-lg font-bold">
                    {formatCurrency(wallet.total_pendapatan)}
                </p>
            </div>
            <div class="hidden sm:block w-px h-8 bg-white/20"></div>
            <div>
                <p
                    class="text-[10px] uppercase tracking-widest opacity-70"
                >
                    Total Dicairkan
                </p>
                <p class="text-lg font-bold">
                    {formatCurrency(wallet.total_dicairkan)}
                </p>
            </div>
        </div>
        <a
            href="/mitra/payouts/create"
            use:inertia
            class="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-green-text font-extrabold text-sm hover:bg-sun hover:text-dark transition-all shadow-md"
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            Tarik Dana
        </a>
    </div>

    <!-- Riwayat Transaksi -->
    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
    >
        <div class="p-5 sm:p-6 border-b border-gray-100">
            <h2 class="text-lg font-extrabold text-dark">
                Riwayat Transaksi
            </h2>
            <p class="text-xs text-gray-500">
                Mutasi saldo wallet Anda
            </p>
        </div>

        {#if transactions.data.length === 0}
            <EmptyState
                icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                title="Belum ada transaksi"
                description="Transaksi akan muncul setelah Anda menyelesaikan trip."
            />
        {:else}
            <div class="divide-y divide-gray-100">
                {#each transactions.data as trx (trx.id)}
                    <div
                        class="p-4 sm:p-5 flex items-center gap-4 hover:bg-gray-50/70 transition-colors"
                    >
                        <div
                            class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 {trx.tipe ===
                            'credit'
                                ? 'bg-green/10 text-green-text'
                                : 'bg-red-50 text-red-700'}"
                        >
                            <svg
                                class="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2.5"
                            >
                                {#if trx.tipe === 'credit'}
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M12 4v16m8-8H4"
                                    />
                                {:else}
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M20 12H4"
                                    />
                                {/if}
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p
                                class="text-sm font-bold text-dark truncate"
                            >
                                {trx.deskripsi}
                            </p>
                            <div
                                class="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5"
                            >
                                <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">
                                    {kategoriLabel(trx.kategori)}
                                </span>
                                <span
                                    >{formatDateTime(
                                        trx.created_at,
                                    )}</span
                                >
                            </div>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <!-- ✅ FIX: tanda & nominal menempel (tanpa spasi di antaranya) -->
                            <p
                                class="text-sm font-extrabold {trx.tipe ===
                                'credit'
                                    ? 'text-green-text'
                                    : 'text-red-700'}"
                            >
                                {trx.tipe === 'credit' ? '+' : '-'}{formatCurrency(trx.jumlah)}
                            </p>
                            <p
                                class="text-[10px] text-gray-500 mt-0.5"
                            >
                                Saldo: {formatCurrency(
                                    trx.saldo_setelah,
                                )}
                            </p>
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Pagination -->
            <Pagination meta={transactions} label="transaksi" />
        {/if}
    </div>
</DashboardLayout>