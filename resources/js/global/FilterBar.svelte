<script lang="ts">
    /**
     * FilterBar — toolbar filter lengkap untuk halaman list.
     *
     * Menggabungkan:
     * - SearchInput (debounced)
     * - StatusTabs (opsional)
     * - Kategori dropdown (opsional)
     * - Date range filter (opsional, collapsible)
     * - Tombol "Hapus Semua Filter"
     *
     * @example Simple (search + tabs)
     *   <FilterBar
     *       bind:search={search}
     *       onSearch={handleSearch}
     *       statusTabs={[
     *           { value: '', label: 'Semua', count: 20 },
     *           { value: 'pending', label: 'Pending', count: 5 },
     *       ]}
     *       bind:selectedStatus={selectedStatus}
     *       onStatusChange={changeStatus}
     *       onClear={clearFilters}
     *       hasActiveFilters={hasActiveFilters}
     *   />
     *
     * @example Dengan date range
     *   <FilterBar
     *       bind:search={search}
     *       onSearch={handleSearch}
     *       bind:selectedStatus={selectedStatus}
     *       statusTabs={...}
     *       onStatusChange={changeStatus}
     *       showDateRange
     *       bind:dateFrom={selectedTanggalDari}
     *       bind:dateTo={selectedTanggalSampai}
     *       onApplyDate={applyAdvancedFilter}
     *       onClear={clearFilters}
     *       hasActiveFilters={hasActiveFilters}
     *   />
     *
     * @example Dengan kategori dropdown
     *   <FilterBar
     *       bind:search={search}
     *       onSearch={handleSearch}
     *       bind:selectedKategori={selectedKategori}
     *       kategoriOptions={[
     *           { value: '', label: 'Semua Kategori' },
     *           { value: 'budaya', label: 'Budaya' },
     *       ]}
     *       onKategoriChange={handleKategoriChange}
     *       onClear={clearFilters}
     *       hasActiveFilters={hasActiveFilters}
     *   />
     */

    import type { KategoriOption, StatusTab } from '@/types';

    import SearchInput from '@/global/SearchInput.svelte';
    import StatusTabs from '@/global/StatusTabs.svelte';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        // Search
        search = $bindable(''),
        onSearch = undefined,
        searchPlaceholder = 'Cari...',

        // Status Tabs (opsional)
        statusTabs = undefined as StatusTab[] | undefined,
        selectedStatus = $bindable(''),
        onStatusChange = undefined,

        // Kategori dropdown (opsional)
        kategoriOptions = undefined as KategoriOption[] | undefined,
        selectedKategori = $bindable(''),
        onKategoriChange = undefined,
        kategoriPlaceholder = 'Semua Kategori',

        // Date range (opsional)
        showDateRange = false,
        dateFrom = $bindable(''),
        dateTo = $bindable(''),
        onApplyDate = undefined,
        dateFromLabel = 'Dari',
        dateToLabel = 'Sampai',

        // Clear
        onClear,
        hasActiveFilters = false,
    }: {
        search?: string;
        onSearch?: ((value: string) => void) | undefined;
        searchPlaceholder?: string;

        statusTabs?: StatusTab[] | undefined;
        selectedStatus?: string;
        onStatusChange?: ((value: string) => void) | undefined;

        kategoriOptions?: KategoriOption[] | undefined;
        selectedKategori?: string;
        onKategoriChange?: ((value: string) => void) | undefined;
        kategoriPlaceholder?: string;

        showDateRange?: boolean;
        dateFrom?: string;
        dateTo?: string;
        onApplyDate?: (() => void) | undefined;
        dateFromLabel?: string;
        dateToLabel?: string;

        onClear: () => void;
        hasActiveFilters?: boolean;
    } = $props();

    // ==========================================
    // STATE
    // ==========================================

    let showAdvanced = $state(false);

    // ==========================================
    // DERIVED
    // ==========================================

    let hasDateFilter = $derived(dateFrom !== '' || dateTo !== '');
    let showSearchRow = $derived(
        onSearch !== undefined ||
            kategoriOptions !== undefined ||
            showDateRange,
    );

    // ==========================================
    // HANDLERS
    // ==========================================

    function handleKategoriChange(e: Event): void {
        const target = e.target as HTMLSelectElement;
        selectedKategori = target.value;
        onKategoriChange?.(selectedKategori);
    }

    function applyDate(): void {
        onApplyDate?.();
    }

    function resetDate(): void {
        dateFrom = '';
        dateTo = '';
        onApplyDate?.();
    }
</script>

<div class="p-4 sm:p-6 border-b border-gray-100 space-y-4">
    <!-- Status Tabs -->
    {#if statusTabs && statusTabs.length > 0}
        <StatusTabs
            tabs={statusTabs}
            bind:active={selectedStatus}
            onchange={onStatusChange}
        />
    {/if}

    <!-- Search + Kategori + Date toggle -->
    {#if showSearchRow}
        <div class="flex flex-col sm:flex-row gap-3">
            <!-- Search -->
            <div class="flex-1">
                <SearchInput
                    bind:value={search}
                    oninput={onSearch}
                    placeholder={searchPlaceholder}
                />
            </div>

            <!-- Kategori dropdown -->
            {#if kategoriOptions}
                <div class="sm:w-48">
                    <select
                        bind:value={selectedKategori}
                        onchange={handleKategoriChange}
                        class="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all cursor-pointer"
                        aria-label={kategoriPlaceholder}
                    >
                        {#each kategoriOptions as opt (opt.value)}
                            <option value={opt.value}>{opt.label}</option>
                        {/each}
                    </select>
                </div>
            {/if}

            <!-- Date toggle -->
            {#if showDateRange}
                <button
                    type="button"
                    onclick={() => (showAdvanced = !showAdvanced)}
                    class="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-dark font-bold text-sm hover:bg-gray-100 transition-all whitespace-nowrap"
                    aria-expanded={showAdvanced}
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
                            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                        />
                    </svg>
                    Filter Tanggal
                    {#if hasDateFilter}
                        <span
                            class="w-2 h-2 rounded-full bg-pink-dark"
                            aria-label="Filter tanggal aktif"
                        ></span>
                    {/if}
                </button>
            {/if}
        </div>
    {/if}

    <!-- Date range panel (collapsible) -->
    {#if showDateRange && showAdvanced}
        <div
            class="p-4 bg-gray-50 rounded-2xl flex flex-col sm:flex-row gap-3 items-end"
        >
            <div class="flex-1">
                <label
                    for="filter-date-from"
                    class="block text-xs font-bold text-dark mb-1.5"
                >
                    {dateFromLabel}
                </label>
                <input
                    id="filter-date-from"
                    type="date"
                    bind:value={dateFrom}
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink transition-all"
                />
            </div>

            <div class="flex-1">
                <label
                    for="filter-date-to"
                    class="block text-xs font-bold text-dark mb-1.5"
                >
                    {dateToLabel}
                </label>
                <input
                    id="filter-date-to"
                    type="date"
                    bind:value={dateTo}
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink transition-all"
                />
            </div>

            <div class="flex gap-2">
                <button
                    type="button"
                    onclick={applyDate}
                    class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md whitespace-nowrap"
                >
                    Terapkan
                </button>
                {#if hasDateFilter}
                    <button
                        type="button"
                        onclick={resetDate}
                        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all whitespace-nowrap"
                    >
                        Reset
                    </button>
                {/if}
            </div>
        </div>
    {/if}

    <!-- Clear All -->
    {#if hasActiveFilters}
        <div class="flex items-center justify-between text-xs">
            <span class="text-gray-500">Filter aktif</span>
            <button
                type="button"
                onclick={onClear}
                class="inline-flex items-center gap-1 font-bold text-pink-text hover:text-sun-text transition-colors"
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
                Hapus Semua Filter
            </button>
        </div>
    {/if}
</div>