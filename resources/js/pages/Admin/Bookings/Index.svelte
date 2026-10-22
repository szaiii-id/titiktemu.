<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import EmptyState from '@/global/EmptyState.svelte';
    import FilterBar from '@/global/FilterBar.svelte';
    import Pagination from '@/global/Pagination.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
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
    import { formatDate, formatDateTime } from '@/utils/formatDate';
    import { adminMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        bookings,
        filters = {
            search: '',
            status: '',
            package_id: '',
            tanggal_dari: '',
            tanggal_sampai: '',
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
        bookings: PaginationMeta & {
            data: Array<
                Booking & {
                    package?: {
                        id: number;
                        nama: string;
                        kode: string;
                        timezone: string;
                    } | null;
                    client?: {
                        id: number;
                        name: string;
                        email: string;
                    } | null;
                }
            >;
        };
        filters: {
            search: string;
            status: string;
            package_id: string;
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

    function handleSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            router.get('/admin/bookings', buildQuery(), {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 300);
    }

    function changeStatus(status: string) {
        selectedStatus = status;
        router.get('/admin/bookings', buildQuery(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function applyAdvancedFilter() {
        router.get('/admin/bookings', buildQuery(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function clearFilters() {
        search = '';
        selectedStatus = '';
        selectedTanggalDari = '';
        selectedTanggalSampai = '';
        clearTimeout(searchTimeout);
        router.get(
            '/admin/bookings',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
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

    const bookingStatusKeys: BookingStatus[] = [
        'pending_payment',
        'payment_verified',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
    ];

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
    // HELPERS
    // ==========================================

    function isUrgent(booking: {
        status: string;
        expired_at: string | null;
    }): boolean {
        if (
            booking.status !== 'pending_payment' ||
            !booking.expired_at
        )
            return false;
        const now = new Date().getTime();
        const expired = new Date(booking.expired_at).getTime();
        const diff = expired - now;
        return diff > 0 && diff < 6 * 60 * 60 * 1000;
    }

    function isOverdue(booking: {
        status: string;
        expired_at: string | null;
    }): boolean {
        if (
            booking.status !== 'pending_payment' ||
            !booking.expired_at
        )
            return false;
        return (
            new Date(booking.expired_at).getTime() <
            new Date().getTime()
        );
    }
</script>

<svelte:head>
    <title>Booking Management | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Booking" menuItems={adminMenu}>
    <PageHeader
        title="Booking Management"
        description="Kelola semua booking dari client — verifikasi, konfirmasi, atau batalkan."
    />

    <!-- Card -->
    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
    >
        <!-- FilterBar -->
        <FilterBar
            bind:search
            onSearch={handleSearch}
            searchPlaceholder="Cari kode booking, nama client, atau paket..."
            statusTabs={statusTabs}
            bind:selectedStatus
            onStatusChange={changeStatus}
            showDateRange
            bind:dateFrom={selectedTanggalDari}
            bind:dateTo={selectedTanggalSampai}
            onApplyDate={applyAdvancedFilter}
            dateFromLabel="Tanggal Keberangkatan Dari"
            dateToLabel="Sampai"
            onClear={clearFilters}
            {hasActiveFilters}
        />

        <!-- Table / Empty -->
        {#if bookings.data.length === 0}
            <EmptyState
                icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                title={hasActiveFilters
                    ? 'Tidak ada booking ditemukan'
                    : 'Belum ada booking'}
                description={hasActiveFilters
                    ? 'Coba ubah filter atau kata kunci pencarian Anda.'
                    : 'Booking dari client akan muncul di sini.'}
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
                                Booking
                            </th>
                            <th
                                class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest hidden md:table-cell"
                            >
                                Client
                            </th>
                            <th
                                class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest hidden lg:table-cell"
                            >
                                Tanggal Berangkat
                            </th>
                            <th
                                class="text-right px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest hidden sm:table-cell"
                            >
                                Total
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
                        {#each bookings.data as booking (booking.id)}
                            <tr
                                class="group hover:bg-gray-50/70 transition-colors {isOverdue(
                                    booking,
                                )
                                    ? 'bg-red-50/30'
                                    : ''}"
                            >
                                <td class="px-6 py-4">
                                    <div class="min-w-0">
                                        <p
                                            class="text-xs font-mono text-gray-500 mb-1"
                                        >
                                            {booking.kode}
                                        </p>
                                        <p
                                            class="font-bold text-dark truncate"
                                        >
                                            {booking.package?.nama ??
                                                'Paket dihapus'}
                                        </p>
                                        <p
                                            class="text-[11px] text-gray-500 mt-0.5"
                                        >
                                            {booking.jumlah_peserta} peserta
                                        </p>
                                        {#if isUrgent(booking)}
                                            <span
                                                class="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sun/10 text-sun-text border border-sun/20"
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
                                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                                Hampir expired
                                            </span>
                                        {/if}
                                        {#if isOverdue(booking)}
                                            <span
                                                class="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200"
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
                                                Overdue
                                            </span>
                                        {/if}
                                    </div>
                                </td>
                                <td
                                    class="px-6 py-4 hidden md:table-cell"
                                >
                                    {#if booking.client}
                                        <div
                                            class="flex items-center gap-3"
                                        >
                                            <div
                                                class="w-8 h-8 rounded-full bg-gradient-to-br from-pink-dark to-purple text-white flex items-center justify-center font-bold text-xs flex-shrink-0"
                                            >
                                                {booking.client.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>
                                            <div class="min-w-0">
                                                <p
                                                    class="font-bold text-dark truncate text-xs"
                                                >
                                                    {booking.client.name}
                                                </p>
                                                <p
                                                    class="text-[11px] text-gray-500 truncate"
                                                >
                                                    {booking.client.email}
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
                                        {formatDate(
                                            booking.tanggal_keberangkatan,
                                        )}
                                    </p>
                                    <p
                                        class="text-[10px] text-gray-500 mt-0.5"
                                    >
                                        Dibuat {formatDateTime(
                                            booking.created_at,
                                        )}
                                    </p>
                                </td>
                                <td
                                    class="px-6 py-4 text-right hidden sm:table-cell"
                                >
                                    <p
                                        class="text-sm font-extrabold text-dark"
                                    >
                                        {formatCurrency(
                                            booking.total_harga,
                                        )}
                                    </p>
                                </td>
                                <td class="px-6 py-4 text-center">
                                    <span
                                        class="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-extrabold {bookingStatusBadge(
                                            booking.status,
                                        )}"
                                    >
                                        {bookingStatusLabel(
                                            booking.status,
                                        )}
                                    </span>
                                </td>
                                <td class="px-6 py-4">
                                    <div
                                        class="flex items-center justify-end gap-2 flex-wrap"
                                    >
                                        <a
                                            href={`/admin/bookings/${booking.id}`}
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
            <Pagination meta={bookings} label="booking" />
        {/if}
    </div>
</DashboardLayout>