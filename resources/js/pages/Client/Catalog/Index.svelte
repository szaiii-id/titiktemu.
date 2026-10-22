<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import EmptyState from '@/global/EmptyState.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import Pagination from '@/global/Pagination.svelte';
    import SearchInput from '@/global/SearchInput.svelte';
    import { inertia, router } from '@inertiajs/svelte';
    import type {
        Package,
        PackageKategori,
        PaginationMeta,
        KategoriOption,
    } from '@/types';
    import {
        packageKategoriBadge,
        packageKategoriLabel,
    } from '@/utils/enums';
    import { formatCurrency } from '@/utils/formatCurrency';
    import { formatDurasi } from '@/utils/duration';
    import { clientMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        packages,
        filters = {
            search: '',
            kategori: '',
            sort: 'nama',
            direction: 'asc',
        },
    }: {
        packages: PaginationMeta & {
            data: Array<
                Pick<
                    Package,
                    | 'id'
                    | 'kode'
                    | 'nama'
                    | 'slug'
                    | 'deskripsi'
                    | 'kategori'
                    | 'durasi_hari'
                    | 'durasi_malam'
                    | 'harga_per_orang'
                    | 'harga_per_rombongan'
                    | 'min_peserta'
                    | 'max_peserta'
                    | 'timezone'
                    | 'cover_image'
                    | 'created_at'
                >
            >;
        };
        filters: {
            search: string;
            kategori: string;
            sort: string;
            direction: string;
        };
    } = $props();

    // ==========================================
    // OPTIONS
    // ==========================================

    const kategoriOptions: KategoriOption[] = [
        { value: '', label: 'Semua Kategori' },
        { value: 'wisata_alam', label: 'Wisata Alam' },
        { value: 'budaya', label: 'Budaya' },
        { value: 'kuliner', label: 'Kuliner' },
        { value: 'petualangan', label: 'Petualangan' },
        { value: 'lainnya', label: 'Lainnya' },
    ];

    const sortOptions = [
        { value: 'nama', label: 'Nama (A-Z)' },
        { value: 'harga_per_orang', label: 'Harga Termurah' },
        { value: 'durasi_hari', label: 'Durasi Terpendek' },
        { value: 'created_at', label: 'Terbaru' },
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
    let selectedKategori = $state(filters.kategori ?? '');
    // svelte-ignore state_referenced_locally
    let selectedSort = $state(filters.sort ?? 'nama');
    let searchTimeout: ReturnType<typeof setTimeout>;

    // ==========================================
    // FILTER HANDLERS
    // ==========================================

    function navigate(
        direction: string = filters.direction,
    ): void {
        router.get(
            '/client/catalog',
            {
                search,
                kategori: selectedKategori,
                sort: selectedSort,
                direction,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

function handleSearch(value: string) {
    console.log('[DEBUG] handleSearch called with:', value);  // ← TAMBAH
    search = value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        console.log('[DEBUG] navigate called, search=', search);  // ← TAMBAH
        navigate();
    }, 300);
}

    function handleKategoriChange(e: Event) {
        const target = e.target as HTMLSelectElement;
        selectedKategori = target.value;
        navigate();
    }

    function handleSortChange(e: Event) {
        const target = e.target as HTMLSelectElement;
        selectedSort = target.value;

        let direction = 'asc';
        if (selectedSort === 'created_at') {
            direction = 'desc';
        }

        navigate(direction);
    }

    function clearFilters() {
        search = '';
        selectedKategori = '';
        selectedSort = 'nama';
        clearTimeout(searchTimeout);
        router.get(
            '/client/catalog',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    let hasActiveFilters = $derived(
        search !== '' || selectedKategori !== '',
    );
</script>

<svelte:head>
    <title>Katalog Paket Wisata | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Katalog Paket" menuItems={clientMenu}>
    <PageHeader
        title="Katalog Paket Wisata"
        description="Temukan paket wisata menarik untuk liburan Anda berikutnya."
    />

    <!-- Filter Bar -->
    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-6"
    >
        <div class="flex flex-col lg:flex-row gap-3">
            <!-- Search -->
            <div class="flex-1">
                <SearchInput
                    bind:value={search}
                    oninput={handleSearch}
                    placeholder="Cari paket wisata..."
                />
            </div>

            <!-- Kategori -->
            <div class="lg:w-48">
                <select
                    bind:value={selectedKategori}
                    onchange={handleKategoriChange}
                    class="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all cursor-pointer"
                    aria-label="Filter kategori"
                >
                    {#each kategoriOptions as opt}
                        <option value={opt.value}>{opt.label}</option>
                    {/each}
                </select>
            </div>

            <!-- Sort -->
            <div class="lg:w-48">
                <select
                    bind:value={selectedSort}
                    onchange={handleSortChange}
                    class="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all cursor-pointer"
                    aria-label="Urutkan"
                >
                    {#each sortOptions as opt}
                        <option value={opt.value}>{opt.label}</option>
                    {/each}
                </select>
            </div>
        </div>
    </div>

    <!-- Empty / Grid -->
    {#if packages.data.length === 0}
        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm"
        >
            <EmptyState
                icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                title={hasActiveFilters
                    ? 'Tidak ada paket ditemukan'
                    : 'Belum ada paket tersedia'}
                description={hasActiveFilters
                    ? 'Coba ubah filter atau kata kunci pencarian Anda.'
                    : 'Paket wisata akan segera hadir. Silakan cek kembali nanti.'}
                hasFilters={hasActiveFilters}
                onClear={clearFilters}
            />
        </div>
    {:else}
        <!-- Grid Paket -->
        <div
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6"
        >
            {#each packages.data as pkg (pkg.id)}
                <a
                    href={`/client/catalog/${pkg.slug}`}
                    use:inertia
                    class="group bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                >
                    <!-- Cover -->
                    <div
                        class="relative h-44 bg-linear-to-br from-pink-dark to-purple flex items-center justify-center text-white font-extrabold text-5xl overflow-hidden"
                    >
                        {#if pkg.cover_image}
                            <img
                                src={`/storage/${pkg.cover_image}`}
                                alt={pkg.nama}
                                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        {:else}
                            <span
                                class="opacity-80 group-hover:scale-110 transition-transform duration-300"
                            >
                                {pkg.nama.charAt(0).toUpperCase()}
                            </span>
                        {/if}

                        <!-- Kategori badge -->
                        <div class="absolute top-3 left-3">
                            <span
                                class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-white/95 backdrop-blur {packageKategoriBadge(
                                    pkg.kategori,
                                )}"
                            >
                                {packageKategoriLabel(pkg.kategori)}
                            </span>
                        </div>

                        <!-- Durasi badge -->
                        <div class="absolute top-3 right-3">
                            <span
                                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-dark/80 backdrop-blur text-white"
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
                                {formatDurasi(
                                    pkg.durasi_hari,
                                    pkg.durasi_malam,
                                )}
                            </span>
                        </div>
                    </div>

                    <!-- Body -->
                    <div class="p-5">
                        <h3
                            class="text-base font-extrabold text-dark mb-1 line-clamp-2 group-hover:text-pink-text transition-colors"
                        >
                            {pkg.nama}
                        </h3>
                        {#if pkg.deskripsi}
                            <p
                                class="text-xs text-gray-500 line-clamp-2 mb-3"
                            >
                                {pkg.deskripsi}
                            </p>
                        {/if}

                        <div
                            class="flex items-end justify-between pt-3 border-t border-gray-100"
                        >
                            <div>
                                <p
                                    class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest"
                                >
                                    Mulai dari
                                </p>
                                <p
                                    class="text-lg font-extrabold text-pink-text"
                                >
                                    {formatCurrency(
                                        pkg.harga_per_orang,
                                    )}
                                </p>
                                <p
                                    class="text-[10px] text-gray-500"
                                >
                                    per orang
                                </p>
                            </div>
                            <div
                                class="w-9 h-9 rounded-full bg-pink-dark text-white flex items-center justify-center shadow-md group-hover:bg-sun-dark group-hover:scale-110 transition-all"
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
        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm"
        >
            <Pagination meta={packages} label="paket" />
        </div>
    {/if}
</DashboardLayout>