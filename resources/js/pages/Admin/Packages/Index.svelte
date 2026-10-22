<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import ConfirmModal from '@/global/ConfirmModal.svelte';
    import EmptyState from '@/global/EmptyState.svelte';
    import FilterBar from '@/global/FilterBar.svelte';
    import Pagination from '@/global/Pagination.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import { inertia, router } from '@inertiajs/svelte';
    import type {
        KategoriOption,
        Package,
        PackageStatus,
        PaginationMeta,
        StatusTab,
    } from '@/types';
    import {
        packageKategoriBadge,
        packageKategoriLabel,
        packageStatusBadge,
        packageStatusLabel,
    } from '@/utils/enums';
    import { formatCurrency } from '@/utils/formatCurrency';
    import { formatDate } from '@/utils/formatDate';
    import { formatDurasi } from '@/utils/duration';
    import { adminMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        packages,
        filters = {
            search: '',
            status: '',
            kategori: '',
            sort: 'created_at',
            direction: 'desc',
        },
        statusCounts = { draft: 0, aktif: 0, arsip: 0 },
    }: {
        packages: PaginationMeta & {
            data: Array<
                Package & {
                    creator?: {
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
            kategori: string;
            sort: string;
            direction: string;
        };
        statusCounts: { draft: number; aktif: number; arsip: number };
    } = $props();

    // ==========================================
    // KATEGORI OPTIONS
    // ==========================================

    const kategoriOptions: KategoriOption[] = [
        { value: '', label: 'Semua Kategori' },
        { value: 'wisata_alam', label: 'Wisata Alam' },
        { value: 'budaya', label: 'Budaya' },
        { value: 'kuliner', label: 'Kuliner' },
        { value: 'petualangan', label: 'Petualangan' },
        { value: 'lainnya', label: 'Lainnya' },
    ];

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
    let selectedKategori = $state(filters.kategori ?? '');
    let searchTimeout: ReturnType<typeof setTimeout>;

    let showDeleteModal = $state(false);
    let packageToDelete = $state<{ id: number; nama: string } | null>(
        null,
    );

    // ==========================================
    // FILTER HANDLERS
    // ==========================================

    function buildQuery() {
        return {
            search,
            status: selectedStatus,
            kategori: selectedKategori,
            sort: filters.sort,
            direction: filters.direction,
        };
    }

    function navigate(): void {
        router.get('/admin/packages', buildQuery(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function handleSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(navigate, 300);
    }

    function handleStatusChange(status: string) {
        selectedStatus = status;
        navigate();
    }

    function handleKategoriChange(value: string) {
        selectedKategori = value;
        navigate();
    }

    function clearFilters() {
        search = '';
        selectedStatus = '';
        selectedKategori = '';
        clearTimeout(searchTimeout);
        router.get(
            '/admin/packages',
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    let hasActiveFilters = $derived(
        search !== '' ||
            selectedStatus !== '' ||
            selectedKategori !== '',
    );

    // ==========================================
    // STATUS TABS
    // ==========================================

    const packageStatusKeys: PackageStatus[] = [
        'draft',
        'aktif',
        'arsip',
    ];

    let totalAll = $derived(
        statusCounts.draft + statusCounts.aktif + statusCounts.arsip,
    );

    let statusTabs: StatusTab[] = $derived([
        { value: '', label: 'Semua', count: totalAll },
        ...packageStatusKeys.map((s) => ({
            value: s,
            label: packageStatusLabel(s),
            count: statusCounts[s] ?? 0,
        })),
    ]);

    // ==========================================
    // DELETE HANDLERS
    // ==========================================

    function confirmDelete(pkg: { id: number; nama: string }) {
        packageToDelete = pkg;
        showDeleteModal = true;
    }

    function deletePackage() {
        if (!packageToDelete) return;
        router.delete(`/admin/packages/${packageToDelete.id}`, {
            onFinish: () => {
                showDeleteModal = false;
                packageToDelete = null;
            },
        });
    }
</script>


<svelte:head>
    <title>Paket Wisata | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Paket Wisata" menuItems={adminMenu}>
    <PageHeader
        title="Paket Wisata"
        description="Kelola paket wisata, itinerary, HPP, dan fasilitas"
    >
        {#snippet actions()}
            <a
                href="/admin/packages/create"
                use:inertia
                class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
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
                        d="M12 4v16m8-8H4"
                    />
                </svg>
                Tambah Paket
            </a>
        {/snippet}
    </PageHeader>

    <!-- Card -->
    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
    >
        <!-- FilterBar -->
        <FilterBar
            bind:search
            onSearch={handleSearch}
            searchPlaceholder="Cari nama, kode, atau deskripsi..."
            statusTabs={statusTabs}
            bind:selectedStatus
            onStatusChange={handleStatusChange}
            kategoriOptions={kategoriOptions}
            bind:selectedKategori
            onKategoriChange={handleKategoriChange}
            onClear={clearFilters}
            {hasActiveFilters}
        />

        <!-- Table / Empty -->
        {#if packages.data.length === 0}
            <EmptyState
                icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                title={hasActiveFilters
                    ? 'Tidak ada hasil ditemukan'
                    : 'Belum ada paket'}
                description={hasActiveFilters
                    ? 'Tidak ditemukan paket dengan filter yang Anda pilih. Coba ubah filter.'
                    : 'Mulai dengan menambahkan paket wisata pertama Anda.'}
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
                                Paket
                            </th>
                            <th
                                class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest"
                            >
                                Kategori
                            </th>
                            <th
                                class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest hidden md:table-cell"
                            >
                                Durasi
                            </th>
                            <th
                                class="text-right px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest hidden sm:table-cell"
                            >
                                Harga/Orang
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
                        {#each packages.data as pkg (pkg.id)}
                            <tr
                                class="group hover:bg-gray-50/70 transition-colors"
                            >
                                <td class="px-6 py-4">
                                    <div
                                        class="flex items-start gap-3"
                                    >
                                        <div
                                            class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-pink-dark to-purple flex items-center justify-center text-white font-extrabold text-sm shadow-md"
                                        >
                                            {pkg.nama
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                        <div class="min-w-0">
                                            <p
                                                class="font-bold text-dark truncate"
                                            >
                                                {pkg.nama}
                                            </p>
                                            <p
                                                class="text-xs text-gray-500 font-mono"
                                            >
                                                {pkg.kode}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <span
                                        class="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-extrabold {packageKategoriBadge(
                                            pkg.kategori,
                                        )}"
                                    >
                                        {packageKategoriLabel(
                                            pkg.kategori,
                                        )}
                                    </span>
                                </td>
                                <td
                                    class="px-6 py-4 hidden md:table-cell"
                                >
                                    <p
                                        class="text-sm font-bold text-dark"
                                    >
                                        {formatDurasi(
                                            pkg.durasi_hari,
                                            pkg.durasi_malam,
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
                                            pkg.harga_per_orang,
                                        )}
                                    </p>
                                </td>
                                <td class="px-6 py-4 text-center">
                                    <span
                                        class="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-extrabold {packageStatusBadge(
                                            pkg.status,
                                        )}"
                                    >
                                        {packageStatusLabel(pkg.status)}
                                    </span>
                                </td>
                                <td class="px-6 py-4">
                                    <div
                                        class="flex items-center justify-end gap-2 flex-wrap"
                                    >
                                        <!-- Detail -->
                                        <a
                                            href={`/admin/packages/${pkg.id}`}
                                            use:inertia
                                            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue bg-blue/5 hover:bg-blue/10 transition-all"
                                            aria-label="Lihat detail paket"
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

                                        <!-- Hapus -->
                                        <button
                                            type="button"
                                            onclick={() =>
                                                confirmDelete({
                                                    id: pkg.id,
                                                    nama: pkg.nama,
                                                })}
                                            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 transition-all"
                                            aria-label="Hapus paket"
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
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                            Hapus
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <Pagination meta={packages} label="paket" />
        {/if}
    </div>
</DashboardLayout>


<!-- Delete Confirmation Modal -->
<ConfirmModal
    bind:open={showDeleteModal}
    variant="danger"
    title="Hapus Paket?"
    description={`Anda akan menghapus paket "${packageToDelete?.nama ?? ''}". Tindakan ini tidak bisa dibatalkan.`}
    confirmLabel="Ya, Hapus"
    onConfirm={deletePackage}
/>