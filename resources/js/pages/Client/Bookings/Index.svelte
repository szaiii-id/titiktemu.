<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import EmptyState from '@/global/EmptyState.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import Pagination from '@/global/Pagination.svelte';
    import SearchInput from '@/global/SearchInput.svelte';
    import StatusTabs from '@/global/StatusTabs.svelte';
    import { inertia, router } from '@inertiajs/svelte';
    import type {
        Booking,
        BookingStatus,
        PaginationMeta,
        StatusTab,
    } from '@/types';
    import {
        bookingStatusBadge,
        bookingStatusLabel,
        bookingStatusShort,
    } from '@/utils/enums';
    import { formatCurrency } from '@/utils/formatCurrency';
    import { formatDate } from '@/utils/formatDate';
    import { clientMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type BookingItem = Pick<
        Booking,
        | 'id'
        | 'kode'
        | 'tanggal_keberangkatan'
        | 'jumlah_peserta'
        | 'total_harga'
        | 'status'
        | 'expired_at'
        | 'created_at'
    > & {
        package: {
            id: number;
            nama: string;
            kode: string;
            timezone: string;
        } | null;
        client: {
            id: number;
            name: string;
            email: string;
        } | null;
    };

    let {
        bookings,
        filters = {
            search: '',
            status: '',
            sort: 'created_at',
            direction: 'desc',
        },
        statusCounts = {
            pending_payment: 0,
            payment_verified: 0,
            confirmed: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0,
        },
    }: {
        bookings: PaginationMeta & { data: BookingItem[] };
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

    function navigate(): void {
        router.get(
            '/client/bookings',
            {
                search,
                status: selectedStatus,
                sort: filters.sort,
                direction: filters.direction,
            },
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

    function changeStatus(status: string) {
        selectedStatus = status;
        navigate();
    }

    function clearFilters() {
        search = '';
        selectedStatus = '';
        clearTimeout(searchTimeout);
        router.get(
            '/client/bookings',
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

    // ==========================================
    // STATUS TABS
    // ==========================================

    const bookingStatusKeys: BookingStatus[] = [
        'pending_payment',
        'payment_verified',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
    ];

    let totalAll = $derived(
        Object.values(statusCounts).reduce((sum, n) => sum + n, 0),
    );

    let statusTabs: StatusTab[] = $derived([
        { value: '', label: 'Semua', count: totalAll },
        ...bookingStatusKeys
            .filter(
                (s) =>
                    statusCounts[s] > 0 || selectedStatus === s,
            )
            .map((s) => ({
                value: s,
                label: bookingStatusShort(s),
                count: statusCounts[s] ?? 0,
            })),
    ]);

    // ==========================================
    // HELPERS — COUNTDOWN
    // ==========================================

    function countdownLabel(
        expiredAt: string | null,
        status: string,
    ): string | null {
        if (status !== 'pending_payment' || !expiredAt) return null;

        const now = new Date().getTime();
        const expired = new Date(expiredAt).getTime();
        const diff = expired - now;

        if (diff <= 0) return 'Expired';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor(
            (diff % (1000 * 60 * 60)) / (1000 * 60),
        );

        if (hours > 0) return `${hours} jam ${minutes} menit`;
        return `${minutes} menit`;
    }

    function isExpiringSoon(
        expiredAt: string | null,
        status: string,
    ): boolean {
        if (status !== 'pending_payment' || !expiredAt) return false;
        const now = new Date().getTime();
        const expired = new Date(expiredAt).getTime();
        const diff = expired - now;
        return diff > 0 && diff < 6 * 60 * 60 * 1000;
    }
</script>

<svelte:head>
    <title>Booking Saya | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Booking Saya" menuItems={clientMenu}>
    <PageHeader
        title="Booking Saya"
        description="Kelola dan pantau semua booking wisata Anda"
    >
        {#snippet actions()}
            <a
                href="/client/catalog"
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
                Jelajah Paket
            </a>
        {/snippet}
    </PageHeader>

    <!-- Status Tabs -->
    <div class="mb-6">
        <StatusTabs
            tabs={statusTabs}
            bind:active={selectedStatus}
            onchange={changeStatus}
        />
    </div>

    <!-- Search Bar -->
    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-6"
    >
        <SearchInput
            bind:value={search}
            oninput={handleSearch}
            placeholder="Cari kode booking atau nama paket..."
        />
    </div>

    <!-- List / Empty -->
    {#if bookings.data.length === 0}
        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm"
        >
            <EmptyState
                icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                title={hasActiveFilters
                    ? 'Tidak ada booking ditemukan'
                    : 'Belum ada booking'}
                description={hasActiveFilters
                    ? 'Coba ubah filter atau kata kunci pencarian Anda.'
                    : 'Mulai jelajahi paket wisata dan buat booking pertama Anda.'}
                hasFilters={hasActiveFilters}
                onClear={clearFilters}
            />
        </div>
    {:else}
        <div class="space-y-4">
            {#each bookings.data as booking (booking.id)}
                <a
                    href={`/client/bookings/${booking.id}`}
                    use:inertia
                    class="group block bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-md hover:border-pink/30 transition-all overflow-hidden"
                >
                    <div class="p-5 sm:p-6">
                        <div
                            class="flex flex-col sm:flex-row sm:items-center gap-4"
                        >
                            <!-- Icon -->
                            <div
                                class="w-14 h-14 rounded-2xl bg-linear-to-br from-pink-dark to-purple flex items-center justify-center text-white font-extrabold text-lg shadow-md shrink-0"
                            >
                                {booking.package?.nama
                                    ?.charAt(0)
                                    .toUpperCase() ?? '?'}
                            </div>

                            <!-- Info -->
                            <div class="flex-1 min-w-0">
                                <div
                                    class="flex flex-wrap items-center gap-2 mb-1"
                                >
                                    <span
                                        class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold {bookingStatusBadge(
                                            booking.status,
                                        )}"
                                    >
                                        {bookingStatusLabel(
                                            booking.status,
                                        )}
                                    </span>
                                    <span
                                        class="text-[11px] text-gray-500 font-mono"
                                        >{booking.kode}</span
                                    >
                                </div>

                                <h3
                                    class="text-base font-extrabold text-dark truncate group-hover:text-pink-text transition-colors"
                                >
                                    {booking.package?.nama ??
                                        'Paket dihapus'}
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
                                        {formatDate(
                                            booking.tanggal_keberangkatan,
                                        )}
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
                                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                        </svg>
                                        {booking.jumlah_peserta} orang
                                    </span>
                                </div>

                                <!-- Countdown -->
                                {#if booking.status === 'pending_payment' && booking.expired_at}
                                    <div
                                        class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold
                                            {isExpiringSoon(
                                                booking.expired_at,
                                                booking.status,
                                            )
                                                ? 'bg-red-50 text-red-700 border border-red-200'
                                                : 'bg-sun/10 text-sun-text border border-sun/20'}"
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
                                        Sisa waktu: {countdownLabel(
                                            booking.expired_at,
                                            booking.status,
                                        )}
                                    </div>
                                {/if}
                            </div>

                            <!-- Harga + Arrow -->
                            <div
                                class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 shrink-0 sm:border-l sm:border-gray-100 sm:pl-4"
                            >
                                <p
                                    class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest sm:text-right"
                                >
                                    Total
                                </p>
                                <p
                                    class="text-lg font-extrabold text-pink-text"
                                >
                                    {formatCurrency(
                                        booking.total_harga,
                                    )}
                                </p>
                                <div
                                    class="w-8 h-8 rounded-full bg-pink-dark text-white flex items-center justify-center shadow-md group-hover:bg-sun-dark group-hover:scale-110 transition-all sm:mt-2"
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
                    </div>
                </a>
            {/each}
        </div>

        <!-- Pagination -->
        <div
            class="mt-6 bg-white rounded-3xl border border-gray-200 shadow-sm"
        >
            <Pagination meta={bookings} label="booking" />
        </div>
    {/if}
</DashboardLayout>