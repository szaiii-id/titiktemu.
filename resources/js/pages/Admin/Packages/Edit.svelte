<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import { inertia, router } from '@inertiajs/svelte';

    // ✅ Import menu terpusat
    import { adminMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================
    let {
        package: pkg,
    }: {
        package: {
            id: number;
            kode: string;
            nama: string;
            slug: string;
            deskripsi: string | null;
            kategori: string;
            durasi_hari: number;
            durasi_malam: number;
            harga_per_orang: string;
            harga_per_rombongan: string | null;
            min_peserta: number;
            max_peserta: number;
            timezone: string;
            cover_image: string | null;
            status: 'draft' | 'aktif' | 'arsip';
            created_at: string;
            updated_at: string;
            creator?: { id: number; name: string; email: string } | null;
        };
    } = $props();

    // ==========================================
    // KATEGORI & TIMEZONE OPTIONS
    // ==========================================
    const kategoriOptions = [
        { value: 'wisata_alam', label: 'Wisata Alam' },
        { value: 'budaya', label: 'Budaya' },
        { value: 'kuliner', label: 'Kuliner' },
        { value: 'petualangan', label: 'Petualangan' },
        { value: 'lainnya', label: 'Lainnya' },
    ];

    const timezoneOptions = [
        { value: 'Asia/Jakarta', label: 'WIB — Jakarta, Jawa, Sumatera (UTC+7)' },
        { value: 'Asia/Makassar', label: 'WITA — Banjarmasin, Makassar, Bali (UTC+8)' },
        { value: 'Asia/Jayapura', label: 'WIT — Ambon, Jayapura (UTC+9)' },
    ];

    // ==========================================
    // PARSE NUMBER (untuk display awal harga decimal)
    // ==========================================
    function parseDecimalForInput(value: string | null | undefined): number | '' {
        if (value === null || value === undefined || value === '') return '';
        const num = parseFloat(value);
        return isNaN(num) ? '' : num;
    }

    // ==========================================
    // STATE
    // ==========================================
    // `pkg` hanya untuk initial value. Setelah user ubah form atau submit,
    // Inertia reload → komponen re-mount → `form` re-init dari `pkg` baru.
    // svelte-ignore state_referenced_locally
    let form = $state({
        nama: pkg.nama,
        deskripsi: pkg.deskripsi ?? '',
        kategori: pkg.kategori,
        timezone: pkg.timezone,
        durasi_hari: pkg.durasi_hari,
        durasi_malam: pkg.durasi_malam,
        min_peserta: pkg.min_peserta,
        max_peserta: pkg.max_peserta,
        harga_per_orang: parseDecimalForInput(pkg.harga_per_orang),
        harga_per_rombongan: parseDecimalForInput(pkg.harga_per_rombongan),
    });

    // Snapshot nilai awal untuk "has changes" check.
    // svelte-ignore state_referenced_locally
    const initialForm = {
        nama: pkg.nama,
        deskripsi: pkg.deskripsi ?? '',
        kategori: pkg.kategori,
        timezone: pkg.timezone,
        durasi_hari: pkg.durasi_hari,
        durasi_malam: pkg.durasi_malam,
        min_peserta: pkg.min_peserta,
        max_peserta: pkg.max_peserta,
        harga_per_orang: parseDecimalForInput(pkg.harga_per_orang),
        harga_per_rombongan: parseDecimalForInput(pkg.harga_per_rombongan),
    };

    let errors = $state<Record<string, string>>({});
    let processing = $state(false);
    let errorCount = $derived(Object.keys(errors).length);

    // Cek apakah ada perubahan dibanding nilai awal
    let hasChanges = $derived(
        form.nama !== initialForm.nama ||
            form.deskripsi !== initialForm.deskripsi ||
            form.kategori !== initialForm.kategori ||
            form.timezone !== initialForm.timezone ||
            form.durasi_hari !== initialForm.durasi_hari ||
            form.durasi_malam !== initialForm.durasi_malam ||
            form.min_peserta !== initialForm.min_peserta ||
            form.max_peserta !== initialForm.max_peserta ||
            Number(form.harga_per_orang) !== Number(initialForm.harga_per_orang) ||
            Number(form.harga_per_rombongan) !== Number(initialForm.harga_per_rombongan),
    );

    // ==========================================
    // HELPERS
    // ==========================================
    function parseNumber(value: string | number): number {
        if (typeof value === 'number') return value;
        const cleaned = value.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }

    function formatHargaOnBlur(field: 'harga_per_orang' | 'harga_per_rombongan') {
        const value = form[field];
        if (value === '' || value === null || value === undefined) return;

        const num = parseNumber(value);
        if (num > 0) {
            form[field] = num;
        }
    }

    // ==========================================
    // SUBMIT
    // ==========================================
    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        errors = {};
        processing = true;

        const payload = {
            nama: form.nama,
            deskripsi: form.deskripsi || null,
            kategori: form.kategori,
            timezone: form.timezone,
            durasi_hari: Number(form.durasi_hari),
            durasi_malam: Number(form.durasi_malam),
            min_peserta: Number(form.min_peserta),
            max_peserta: Number(form.max_peserta),
            harga_per_orang: parseNumber(form.harga_per_orang),
            harga_per_rombongan: form.harga_per_rombongan
                ? parseNumber(form.harga_per_rombongan)
                : null,
        };

        router.put(`/admin/packages/${pkg.id}`, payload, {
            onError: (err) => {
                errors = err as Record<string, string>;
                processing = false;
            },
            onFinish: () => {
                processing = false;
            },
        });
    }

    // ==========================================
    // RESET
    // ==========================================
    function resetForm() {
        form = { ...initialForm };
        errors = {};
    }
</script>

<svelte:head>
    <title>Edit {pkg.nama} | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Edit Paket" menuItems={adminMenu}>
    <!-- Breadcrumb -->
    <div class="mb-5">
        <a
            href={`/admin/packages/${pkg.id}`}
            use:inertia
            class="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-pink-text transition-colors"
        >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Detail Paket
        </a>
    </div>

    <div class="max-w-3xl mx-auto">
        <!-- Error Alert -->
        {#if errorCount > 0}
            <div class="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-3">
                <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                <div>
                    <p class="text-sm text-red-700 font-bold">Terdapat {errorCount} kesalahan pada form</p>
                    <p class="text-xs text-red-600 mt-0.5">Silakan periksa kembali data yang Anda masukkan.</p>
                </div>
            </div>
        {/if}

        <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <!-- Header Card -->
            <div class="p-5 sm:p-6 border-b border-gray-100 flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-dark to-purple text-white flex items-center justify-center font-extrabold text-lg shadow-md flex-shrink-0">
                    {pkg.nama.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                        <h2 class="text-lg font-extrabold text-dark truncate">Edit {pkg.nama}</h2>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-700 border border-gray-200">
                            {pkg.kode}
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 truncate">
                        Ubah informasi dasar & harga paket. Kode paket tidak dapat diubah.
                    </p>
                </div>
            </div>

            <!-- Form -->
            <form onsubmit={handleSubmit}>
                <!-- === INFO DASAR === -->
                <div class="p-5 sm:p-6 border-b border-gray-100">
                    <div class="flex items-center gap-2 mb-4">
                        <div class="w-7 h-7 rounded-lg bg-purple/10 text-purple flex items-center justify-center flex-shrink-0">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 class="text-sm font-extrabold text-dark uppercase tracking-wider">Info Dasar</h3>
                    </div>

                    <div class="space-y-4">
                        <!-- Nama -->
                        <div>
                            <label for="nama" class="block text-xs font-bold text-dark mb-1.5">
                                Nama Paket <span class="text-pink">*</span>
                            </label>
                            <input
                                id="nama"
                                type="text"
                                bind:value={form.nama}
                                required
                                placeholder="Contoh: Wisata Pasar Terapung 2D1N"
                                class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                                    {errors.nama
                                        ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                        : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                            />
                            {#if errors.nama}<p class="text-pink text-[11px] mt-1 font-bold">{errors.nama}</p>{/if}
                        </div>

                        <!-- Deskripsi -->
                        <div>
                            <label for="deskripsi" class="block text-xs font-bold text-dark mb-1.5">
                                Deskripsi <span class="text-gray-400 font-normal">(opsional)</span>
                            </label>
                            <textarea
                                id="deskripsi"
                                bind:value={form.deskripsi}
                                rows="3"
                                placeholder="Jelaskan secara singkat tentang paket wisata ini..."
                                class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all resize-none
                                    {errors.deskripsi
                                        ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                        : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                            ></textarea>
                            {#if errors.deskripsi}<p class="text-pink text-[11px] mt-1 font-bold">{errors.deskripsi}</p>{/if}
                        </div>

                        <!-- Kategori & Timezone (2 kolom) -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="kategori" class="block text-xs font-bold text-dark mb-1.5">
                                    Kategori <span class="text-pink">*</span>
                                </label>
                                <select
                                    id="kategori"
                                    bind:value={form.kategori}
                                    class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:outline-none transition-all cursor-pointer
                                        {errors.kategori
                                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                                >
                                    {#each kategoriOptions as opt}
                                        <option value={opt.value}>{opt.label}</option>
                                    {/each}
                                </select>
                                {#if errors.kategori}<p class="text-pink text-[11px] mt-1 font-bold">{errors.kategori}</p>{/if}
                            </div>

                            <div>
                                <label for="timezone" class="block text-xs font-bold text-dark mb-1.5">
                                    Timezone Lokasi Tour <span class="text-pink">*</span>
                                </label>
                                <select
                                    id="timezone"
                                    bind:value={form.timezone}
                                    class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:outline-none transition-all cursor-pointer
                                        {errors.timezone
                                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                                >
                                    {#each timezoneOptions as opt}
                                        <option value={opt.value}>{opt.label}</option>
                                    {/each}
                                </select>
                                {#if errors.timezone}<p class="text-pink text-[11px] mt-1 font-bold">{errors.timezone}</p>{/if}
                            </div>
                        </div>

                        <!-- Durasi (2 kolom) -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="durasi_hari" class="block text-xs font-bold text-dark mb-1.5">
                                    Durasi Hari <span class="text-pink">*</span>
                                </label>
                                <input
                                    id="durasi_hari"
                                    type="number"
                                    bind:value={form.durasi_hari}
                                    min="1"
                                    max="30"
                                    required
                                    class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:outline-none transition-all
                                        {errors.durasi_hari
                                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                                />
                                {#if errors.durasi_hari}<p class="text-pink text-[11px] mt-1 font-bold">{errors.durasi_hari}</p>{/if}
                            </div>

                            <div>
                                <label for="durasi_malam" class="block text-xs font-bold text-dark mb-1.5">
                                    Durasi Malam <span class="text-pink">*</span>
                                </label>
                                <input
                                    id="durasi_malam"
                                    type="number"
                                    bind:value={form.durasi_malam}
                                    min="0"
                                    max="29"
                                    required
                                    class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:outline-none transition-all
                                        {errors.durasi_malam
                                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                                />
                                {#if errors.durasi_malam}<p class="text-pink text-[11px] mt-1 font-bold">{errors.durasi_malam}</p>{/if}
                            </div>
                        </div>

                        <!-- Peserta (2 kolom) -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="min_peserta" class="block text-xs font-bold text-dark mb-1.5">
                                    Minimal Peserta <span class="text-pink">*</span>
                                </label>
                                <input
                                    id="min_peserta"
                                    type="number"
                                    bind:value={form.min_peserta}
                                    min="1"
                                    max="1000"
                                    required
                                    class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:outline-none transition-all
                                        {errors.min_peserta
                                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                                />
                                {#if errors.min_peserta}<p class="text-pink text-[11px] mt-1 font-bold">{errors.min_peserta}</p>{/if}
                            </div>

                            <div>
                                <label for="max_peserta" class="block text-xs font-bold text-dark mb-1.5">
                                    Maksimal Peserta <span class="text-pink">*</span>
                                </label>
                                <input
                                    id="max_peserta"
                                    type="number"
                                    bind:value={form.max_peserta}
                                    min="1"
                                    max="1000"
                                    required
                                    class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:outline-none transition-all
                                        {errors.max_peserta
                                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                                />
                                {#if errors.max_peserta}<p class="text-pink text-[11px] mt-1 font-bold">{errors.max_peserta}</p>{/if}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- === HARGA === -->
                <div class="p-5 sm:p-6 border-b border-gray-100">
                    <div class="flex items-center gap-2 mb-4">
                        <div class="w-7 h-7 rounded-lg bg-sun/10 text-sun-text flex items-center justify-center flex-shrink-0">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 class="text-sm font-extrabold text-dark uppercase tracking-wider">Harga</h3>
                    </div>

                    <div class="space-y-4">
                        <!-- Harga per orang -->
                        <div>
                            <label for="harga_per_orang" class="block text-xs font-bold text-dark mb-1.5">
                                Harga per Orang <span class="text-pink">*</span>
                            </label>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">
                                    Rp
                                </span>
                                <input
                                    id="harga_per_orang"
                                    type="text"
                                    inputmode="numeric"
                                    bind:value={form.harga_per_orang}
                                    onblur={() => formatHargaOnBlur('harga_per_orang')}
                                    required
                                    placeholder="850000"
                                    class="w-full pl-12 pr-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                                        {errors.harga_per_orang
                                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                                />
                            </div>
                            {#if errors.harga_per_orang}<p class="text-pink text-[11px] mt-1 font-bold">{errors.harga_per_orang}</p>{/if}
                        </div>

                        <!-- Harga per rombongan -->
                        <div>
                            <label for="harga_per_rombongan" class="block text-xs font-bold text-dark mb-1.5">
                                Harga per Rombongan <span class="text-gray-400 font-normal">(opsional)</span>
                            </label>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">
                                    Rp
                                </span>
                                <input
                                    id="harga_per_rombongan"
                                    type="text"
                                    inputmode="numeric"
                                    bind:value={form.harga_per_rombongan}
                                    onblur={() => formatHargaOnBlur('harga_per_rombongan')}
                                    placeholder="Kosongkan jika tidak ada"
                                    class="w-full pl-12 pr-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                                        {errors.harga_per_rombongan
                                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                                />
                            </div>
                            {#if errors.harga_per_rombongan}<p class="text-pink text-[11px] mt-1 font-bold">{errors.harga_per_rombongan}</p>{/if}
                        </div>
                    </div>
                </div>

                <!-- Info: kenapa kode tidak bisa diubah -->
                <div class="p-5 sm:p-6 bg-blue/5">
                    <div class="flex items-start gap-3">
                        <svg class="w-5 h-5 text-blue flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p class="text-xs text-blue-text">
                            <strong>Kode paket tidak dapat diubah</strong> untuk menjaga integritas data. Kalau Anda perlu
                            mengubah kode, buat paket baru dan arsipkan yang lama.
                        </p>
                    </div>
                </div>

                <!-- Actions -->
                <div class="p-4 sm:p-5 bg-gray-50/50 flex flex-col-reverse sm:flex-row gap-2">
                    <button
                        type="button"
                        onclick={resetForm}
                        disabled={!hasChanges || processing}
                        class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset
                    </button>
                    <button
                        type="submit"
                        disabled={processing || !hasChanges}
                        class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {#if processing}
                            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            Menyimpan...
                        {:else}
                            Simpan Perubahan
                        {/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
</DashboardLayout>