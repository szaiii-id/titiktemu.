<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import { inertia, router } from '@inertiajs/svelte';

    import { adminMenu } from '@/utils/menus';

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
    // STATE
    // ==========================================
    let step = $state<1 | 2>(1);

    let form = $state({
        // Step 1: Info dasar
        nama: '',
        deskripsi: '',
        kategori: 'wisata_alam',
        timezone: 'Asia/Makassar',
        durasi_hari: 1,
        durasi_malam: 0,
        min_peserta: 1,
        max_peserta: 20,

        // Step 2: Harga
        harga_per_orang: '' as string | number,
        harga_per_rombongan: '' as string | number,
    });

    let errors = $state<Record<string, string>>({});
    let processing = $state(false);
    let errorCount = $derived(Object.keys(errors).length);

    // ==========================================
    // STEP NAVIGATION
    // ==========================================
    function goToStep2() {
        // Validasi step 1 minimal (client-side)
        const step1Errors: Record<string, string> = {};

        if (!form.nama || form.nama.length < 3) {
            step1Errors.nama = 'Nama paket minimal 3 karakter.';
        }
        if (form.durasi_hari < 1) {
            step1Errors.durasi_hari = 'Durasi hari minimal 1.';
        }
        if (form.durasi_malam >= form.durasi_hari) {
            step1Errors.durasi_malam = 'Durasi malam harus kurang dari durasi hari.';
        }
        if (form.min_peserta > form.max_peserta) {
            step1Errors.min_peserta = 'Minimal peserta tidak boleh lebih besar dari maksimal peserta.';
        }

        if (Object.keys(step1Errors).length > 0) {
            errors = step1Errors;
            return;
        }

        errors = {};
        step = 2;
    }

    function backToStep1() {
        step = 1;
        errors = {};
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

        router.post('/admin/packages', payload, {
            onError: (err) => {
                errors = err as Record<string, string>;
                // Kalau error di step 1, kembali ke step 1
                const step1Fields = ['nama', 'deskripsi', 'kategori', 'timezone', 'durasi_hari', 'durasi_malam', 'min_peserta', 'max_peserta'];
                if (Object.keys(err).some((k) => step1Fields.includes(k))) {
                    step = 1;
                }
                processing = false;
            },
            onFinish: () => {
                processing = false;
            },
        });
    }

    /**
     * Parse angka dari input (bisa string dengan titik/koma atau number).
     */
    function parseNumber(value: string | number): number {
        if (typeof value === 'number') return value;
        // Hapus titik (ribuan) dan ganti koma jadi titik (desimal)
        const cleaned = value.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Format input harga saat blur (auto-format).
     */
    function formatHargaOnBlur(field: 'harga_per_orang' | 'harga_per_rombongan') {
        const value = form[field];
        if (value === '' || value === null || value === undefined) return;

        const num = parseNumber(value);
        if (num > 0) {
            form[field] = num;
        }
    }
</script>

<svelte:head>
    <title>Tambah Paket Wisata | Titiktemu</title>
</svelte:head>

<!-- ✅ Gunakan adminMenu -->
<DashboardLayout title="Tambah Paket" menuItems={adminMenu}>
    <!-- Breadcrumb -->
    <div class="mb-5">
        <a
            href="/admin/packages"
            use:inertia
            class="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-pink-text transition-colors"
        >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Daftar Paket
        </a>
    </div>

    <!-- Stepper (Compact) -->
    <div class="max-w-3xl mx-auto mb-5">
        <div class="flex items-center gap-2 sm:gap-3">
            <!-- Step 1 -->
            <div class="flex items-center gap-2 flex-shrink-0">
                <div class="w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs transition-all {step === 1 ? 'bg-pink-dark text-white shadow-md shadow-pink/30' : 'bg-green text-white'}">
                    {#if step > 1}
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    {:else}
                        1
                    {/if}
                </div>
                <span class="text-xs sm:text-sm font-bold transition-colors {step === 1 ? 'text-dark' : 'text-gray-400'}">
                    Info Dasar
                </span>
            </div>

            <!-- Garis -->
            <div class="flex-1 h-0.5 rounded-full transition-colors {step > 1 ? 'bg-green' : 'bg-gray-200'}"></div>

            <!-- Step 2 -->
            <div class="flex items-center gap-2 flex-shrink-0">
                <div class="w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs transition-all {step === 2 ? 'bg-pink-dark text-white shadow-md shadow-pink/30' : 'bg-gray-200 text-gray-500'}">
                    2
                </div>
                <span class="text-xs sm:text-sm font-bold transition-colors {step === 2 ? 'text-dark' : 'text-gray-400'}">
                    Harga
                </span>
            </div>
        </div>
    </div>

    <!-- ==========================================
         STEP 1: Info Dasar
    ========================================== -->
    {#if step === 1}
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
                <div class="p-5 sm:p-6 border-b border-gray-100 flex items-start gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-purple/10 text-purple flex items-center justify-center flex-shrink-0">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div class="min-w-0">
                        <h2 class="text-lg font-extrabold text-dark">Informasi Dasar Paket</h2>
                        <p class="text-xs text-gray-500">Isi nama, kategori, durasi, dan detail dasar paket wisata.</p>
                    </div>
                </div>

                <form onsubmit={(e) => { e.preventDefault(); goToStep2(); }}>
                    <div class="p-5 sm:p-6 space-y-5">
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
                                Deskripsi <span class="text-gray-600 font-normal">(opsional)</span>
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
                                <p class="text-[11px] text-gray-500 mt-1">Contoh: 2D1N = 2 hari, 1 malam</p>
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

                    <!-- Actions -->
                    <div class="p-4 sm:p-5 bg-gray-50/50 flex flex-col-reverse sm:flex-row gap-2">
                        <a
                            href="/admin/packages"
                            use:inertia
                            class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all"
                        >
                            Batal
                        </a>
                        <button
                            type="submit"
                            class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md"
                        >
                            Lanjut ke Harga
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- ==========================================
         STEP 2: Harga
    ========================================== -->
    {#if step === 2}
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
                <div class="p-5 sm:p-6 border-b border-gray-100 flex items-start justify-between gap-4">
                    <div class="flex items-start gap-3 min-w-0">
                        <div class="w-11 h-11 rounded-2xl bg-sun/10 text-sun-text flex items-center justify-center flex-shrink-0">
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div class="min-w-0">
                            <h2 class="text-lg font-extrabold text-dark">Harga Jual Paket</h2>
                            <p class="text-xs text-gray-500">Tentukan harga jual per orang dan/atau per rombongan.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onclick={backToStep1}
                        class="text-xs font-bold text-gray-500 hover:text-pink-text transition-colors whitespace-nowrap flex-shrink-0"
                    >
                        Ubah Info Dasar
                    </button>
                </div>

                <form onsubmit={handleSubmit}>
                    <div class="p-5 sm:p-6 space-y-5">
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
                            <p class="text-[11px] text-gray-500 mt-1">Harga default per peserta (dikalikan jumlah peserta saat booking).</p>
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
                            <p class="text-[11px] text-gray-500 mt-1">Harga flat untuk seluruh rombongan (tidak dikali jumlah peserta).</p>
                        </div>

                        <!-- Info tambahan -->
                        <div class="bg-blue/5 border border-blue/20 rounded-2xl p-4 flex items-start gap-3">
                            <svg class="w-5 h-5 text-blue flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p class="text-xs font-bold text-blue-text">Langkah selanjutnya</p>
                                <p class="text-xs text-blue-text/80 mt-0.5">
                                    Setelah paket dibuat, Anda akan diarahkan ke halaman detail untuk menambahkan
                                    <strong>itinerary per hari</strong>, <strong>HPP</strong>, dan <strong>fasilitas</strong>.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="p-4 sm:p-5 bg-gray-50/50 flex flex-col-reverse sm:flex-row gap-2">
                        <button
                            type="button"
                            onclick={backToStep1}
                            class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all"
                        >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Kembali
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {#if processing}
                                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                Membuat Paket...
                            {:else}
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Buat Paket
                            {/if}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}
</DashboardLayout>