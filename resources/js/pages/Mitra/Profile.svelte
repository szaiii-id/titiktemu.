<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import ImageUploader from '@/global/ImageUploader.svelte';
    import { inertia, router, page } from '@inertiajs/svelte';
    import type { Profile } from '@/types';
    import { mitraMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type ProfileData = Pick<
        Profile,
        | 'id'
        | 'nama_penyedia_usaha'
        | 'nomor_identitas'
        | 'alamat'
        | 'telepon'
        | 'provinsi'
        | 'kota'
        | 'kode_pos'
        | 'logo'
        | 'deskripsi'
    >;

    let {
        profile,
    }: {
        profile: ProfileData | null;
    } = $props();

    // ==========================================
    // STATE
    // ==========================================

    // Form state — di-init dari props `profile` (initial value).
    // Setelah submit → router.post → Inertia reload → komponen re-mount
    // → form re-init. Jadi tidak perlu sync via $effect.
    // svelte-ignore state_referenced_locally
    let form = $state({
        nama_penyedia_usaha: profile?.nama_penyedia_usaha ?? '',
        nomor_identitas: profile?.nomor_identitas ?? '',
        alamat: profile?.alamat ?? '',
        telepon: profile?.telepon ?? '',
        provinsi: profile?.provinsi ?? '',
        kota: profile?.kota ?? '',
        kode_pos: profile?.kode_pos ?? '',
        deskripsi: profile?.deskripsi ?? '',
    });

    let logoFiles = $state<File[]>([]);
    // svelte-ignore state_referenced_locally
    let existingLogo = $state<string[]>(
        profile?.logo ? [`/storage/${profile.logo}`] : [],
    );

    let errors = $state<Record<string, string>>({});
    let processing = $state(false);
    let errorCount = $derived(Object.keys(errors).length);

    let user = $derived(page.props.auth?.user);

    // ==========================================
    // SUBMIT
    // ==========================================

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        errors = {};
        processing = true;

        const formData = new FormData();
        formData.append('_method', 'PUT');
        formData.append('nama_penyedia_usaha', form.nama_penyedia_usaha);
        formData.append('nomor_identitas', form.nomor_identitas);
        formData.append('alamat', form.alamat);
        formData.append('telepon', form.telepon);
        formData.append('provinsi', form.provinsi);
        formData.append('kota', form.kota);
        formData.append('kode_pos', form.kode_pos);
        formData.append('deskripsi', form.deskripsi);

        if (logoFiles.length > 0) {
            formData.append('logo', logoFiles[0]);
        }

        router.post('/mitra/profile', formData, {
            forceFormData: true,
            onError: (err) => {
                errors = err as Record<string, string>;
                processing = false;
            },
            onFinish: () => {
                processing = false;
            },
        });
    }
</script>

<svelte:head>
    <title>Profile Usaha | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Profile Usaha" menuItems={mitraMenu}>
    <PageHeader
        title="Profile Usaha"
        description="Kelola informasi usaha Anda. Data ini akan ditampilkan ke client."
    />

    <!-- Error Alert -->
    {#if errorCount > 0}
        <div
            class="mb-5 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-3"
        >
            <svg
                class="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
            >
                <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                />
            </svg>
            <div>
                <p class="text-sm text-red-700 font-bold">
                    Terdapat {errorCount} kesalahan pada form
                </p>
                <p class="text-xs text-red-600 mt-0.5">
                    Silakan periksa kembali data yang Anda masukkan.
                </p>
            </div>
        </div>
    {/if}

    <form onsubmit={handleSubmit} class="max-w-4xl mx-auto space-y-5">
        <!-- ==========================================
             CARD HEADER: Logo + Info Usaha
        ========================================== -->
        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
        >
            <div class="p-5 sm:p-6">
                <div
                    class="flex flex-col sm:flex-row items-center sm:items-start gap-5"
                >
                    <!-- Logo Uploader -->
                    <div class="shrink-0 w-full sm:w-32">
                        <ImageUploader
                            bind:files={logoFiles}
                            existingUrls={existingLogo}
                            maxFiles={1}
                            maxSizeMB={2}
                            accept="image/jpeg,image/png,image/svg+xml,image/webp"
                            single
                            label="Logo Usaha"
                            validationLabel="logo"
                            error={errors.logo}
                            onRemoveExisting={() => {
                                existingLogo = [];
                            }}
                        />
                    </div>

                    <!-- Info -->
                    <div
                        class="flex-1 min-w-0 text-center sm:text-left"
                    >
                        <div
                            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue/10 text-blue text-[10px] font-extrabold mb-2"
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
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                            </svg>
                            MITRA
                        </div>
                        <h2
                            class="text-xl font-extrabold text-dark truncate"
                            data-testid="display-nama-usaha" 
                        >
                            {form.nama_penyedia_usaha ||
                                user?.name ||
                                'Nama Usaha'}
                        </h2>
                        <p class="text-sm text-gray-500 truncate mt-0.5">
                            {user?.email}
                        </p>
                        <p
                            class="text-xs text-gray-500 mt-2 leading-relaxed"
                        >
                            Logo disarankan rasio 1:1, format
                            JPG/PNG/SVG/WEBP, maks 2MB.
                        </p>
                    </div>
                </div>

                {#if errors.logo}
                    <p
                        class="text-pink text-[11px] mt-3 font-bold text-center sm:text-left"
                    >
                        {errors.logo}
                    </p>
                {/if}
            </div>
        </div>

        <!-- ==========================================
             CARD: Data Usaha
        ========================================== -->
        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
        >
            <div
                class="p-5 sm:p-6 border-b border-gray-100 flex items-center gap-3"
            >
                <div
                    class="w-9 h-9 rounded-2xl bg-blue/10 text-blue flex items-center justify-center shrink-0"
                >
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                    </svg>
                </div>
                <div>
                    <h3 class="text-base font-extrabold text-dark">
                        Data Usaha
                    </h3>
                    <p class="text-xs text-gray-500">
                        Informasi utama usaha Anda
                    </p>
                </div>
            </div>

            <div class="p-5 sm:p-6 space-y-5">
                <!-- Nama Usaha -->
                <div>
                    <label
                        for="nama_penyedia_usaha"
                        class="block text-xs font-bold text-dark mb-1.5"
                    >
                        Nama Usaha
                    </label>
                    <input
                        id="nama_penyedia_usaha"
                        type="text"
                        bind:value={form.nama_penyedia_usaha}
                        placeholder={user?.name ?? 'Nama usaha Anda'}
                        class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                            {errors.nama_penyedia_usaha
                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                    />
                    <p class="text-[11px] text-gray-500 mt-1">
                        Kosongkan untuk menggunakan nama Anda (<strong
                            >{user?.name}</strong
                        >).
                    </p>
                    {#if errors.nama_penyedia_usaha}
                        <p class="text-pink text-[11px] mt-1 font-bold">
                            {errors.nama_penyedia_usaha}
                        </p>
                    {/if}
                </div>

                <!-- Nomor Identitas -->
                <div>
                    <label
                        for="nomor_identitas"
                        class="block text-xs font-bold text-dark mb-1.5"
                    >
                        Nomor Identitas
                    </label>
                    <input
                        id="nomor_identitas"
                        type="text"
                        bind:value={form.nomor_identitas}
                        placeholder="NIK atau NPWP"
                        class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                    />
                    {#if errors.nomor_identitas}
                        <p class="text-pink text-[11px] mt-1 font-bold">
                            {errors.nomor_identitas}
                        </p>
                    {/if}
                </div>

                <!-- Deskripsi -->
                <div>
                    <label
                        for="deskripsi"
                        class="block text-xs font-bold text-dark mb-1.5"
                    >
                        Deskripsi Usaha
                    </label>
                    <textarea
                        id="deskripsi"
                        bind:value={form.deskripsi}
                        rows="3"
                        placeholder="Ceritakan singkat tentang usaha Anda..."
                        class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all resize-none"
                    ></textarea>
                    {#if errors.deskripsi}
                        <p class="text-pink text-[11px] mt-1 font-bold">
                            {errors.deskripsi}
                        </p>
                    {/if}
                </div>
            </div>
        </div>

        <!-- ==========================================
             CARD: Kontak & Alamat
        ========================================== -->
        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
        >
            <div
                class="p-5 sm:p-6 border-b border-gray-100 flex items-center gap-3"
            >
                <div
                    class="w-9 h-9 rounded-2xl bg-purple/10 text-purple flex items-center justify-center shrink-0"
                >
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                    </svg>
                </div>
                <div>
                    <h3 class="text-base font-extrabold text-dark">
                        Kontak & Alamat
                    </h3>
                    <p class="text-xs text-gray-500">
                        Informasi kontak dan lokasi usaha
                    </p>
                </div>
            </div>

            <div class="p-5 sm:p-6 space-y-5">
                <!-- Telepon -->
                <div>
                    <label
                        for="telepon"
                        class="block text-xs font-bold text-dark mb-1.5"
                    >
                        Telepon
                    </label>
                    <input
                        id="telepon"
                        type="text"
                        bind:value={form.telepon}
                        placeholder="+62 812 3456 7890"
                        class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                    />
                    {#if errors.telepon}
                        <p class="text-pink text-[11px] mt-1 font-bold">
                            {errors.telepon}
                        </p>
                    {/if}
                </div>

                <!-- Alamat -->
                <div>
                    <label
                        for="alamat"
                        class="block text-xs font-bold text-dark mb-1.5"
                    >
                        Alamat
                    </label>
                    <textarea
                        id="alamat"
                        bind:value={form.alamat}
                        rows="2"
                        placeholder="Alamat lengkap"
                        class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all resize-none"
                    ></textarea>
                    {#if errors.alamat}
                        <p class="text-pink text-[11px] mt-1 font-bold">
                            {errors.alamat}
                        </p>
                    {/if}
                </div>

                <!-- Grid 3 kolom -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label
                            for="provinsi"
                            class="block text-xs font-bold text-dark mb-1.5"
                        >
                            Provinsi
                        </label>
                        <input
                            id="provinsi"
                            type="text"
                            bind:value={form.provinsi}
                            placeholder="Contoh: Bali"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                        />
                        {#if errors.provinsi}
                            <p
                                class="text-pink text-[11px] mt-1 font-bold"
                            >
                                {errors.provinsi}
                            </p>
                        {/if}
                    </div>
                    <div>
                        <label
                            for="kota"
                            class="block text-xs font-bold text-dark mb-1.5"
                        >
                            Kota
                        </label>
                        <input
                            id="kota"
                            type="text"
                            bind:value={form.kota}
                            placeholder="Contoh: Denpasar"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                        />
                        {#if errors.kota}
                            <p
                                class="text-pink text-[11px] mt-1 font-bold"
                            >
                                {errors.kota}
                            </p>
                        {/if}
                    </div>
                    <div>
                        <label
                            for="kode_pos"
                            class="block text-xs font-bold text-dark mb-1.5"
                        >
                            Kode Pos
                        </label>
                        <input
                            id="kode_pos"
                            type="text"
                            bind:value={form.kode_pos}
                            placeholder="80119"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                        />
                        {#if errors.kode_pos}
                            <p
                                class="text-pink text-[11px] mt-1 font-bold"
                            >
                                {errors.kode_pos}
                            </p>
                        {/if}
                    </div>
                </div>
            </div>
        </div>

        <!-- ==========================================
             ACTIONS (sticky bottom)
        ========================================== -->
        <div class="sticky bottom-3 sm:bottom-4 z-10">
            <div
                class="bg-white rounded-3xl border border-gray-200 shadow-lg p-4 flex flex-col-reverse sm:flex-row gap-2"
            >
                <a
                    href="/mitra/dashboard"
                    use:inertia
                    class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all"
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
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                    Batal
                </a>
                <button
                    type="submit"
                    disabled={processing}
                    class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {#if processing}
                        <svg
                            class="w-4 h-4 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <circle
                                class="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                stroke-width="4"
                            ></circle>
                            <path
                                class="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            ></path>
                        </svg>
                        Menyimpan...
                    {:else}
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
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                        Simpan Perubahan
                    {/if}
                </button>
            </div>
        </div>
    </form>
</DashboardLayout>