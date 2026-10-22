<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import BackButton from '@/global/BackButton.svelte';
    import { inertia, router } from '@inertiajs/svelte';
    import { adminMenu } from '@/utils/menus';

    // ==========================================
    // TYPES
    // ==========================================

    type Role = 'admin' | 'mitra';

    // ==========================================
    // STATE
    // ==========================================

    let step = $state<1 | 2>(1);
    let role = $state<Role>('admin');

    let form = $state({
        name: '',
        username: '',
        email: '',
        password: '',
        // Mitra fields
        nama_penyedia_usaha: '',
        nomor_identitas: '',
        alamat: '',
        telepon: '',
        provinsi: '',
        kota: '',
        kode_pos: '',
        deskripsi: '',
    });

    let errors = $state<Record<string, string>>({});
    let processing = $state(false);
    let showPassword = $state(false);

    let errorCount = $derived(Object.keys(errors).length);

    // ==========================================
    // HANDLERS
    // ==========================================

    function selectRole(r: Role) {
        role = r;
        step = 2;
    }

    function backToStep1() {
        step = 1;
        errors = {};
    }

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        errors = {};
        processing = true;

        const payload: Record<string, string | null> = {
            role,
            name: form.name,
            username: form.username || null,
            email: form.email,
            password: form.password || null,
        };

        if (role === 'mitra') {
            payload.nama_penyedia_usaha =
                form.nama_penyedia_usaha || null;
            payload.nomor_identitas = form.nomor_identitas || null;
            payload.alamat = form.alamat || null;
            payload.telepon = form.telepon || null;
            payload.provinsi = form.provinsi || null;
            payload.kota = form.kota || null;
            payload.kode_pos = form.kode_pos || null;
            payload.deskripsi = form.deskripsi || null;
        }

        router.post('/admin/users', payload, {
            onError: (err) => {
                errors = err as Record<string, string>;
                processing = false;
            },
            onFinish: () => {
                processing = false;
            },
        });
    }

    function generatePassword() {
        const chars =
            'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
        let pwd = '';
        for (let i = 0; i < 12; i++) {
            pwd += chars.charAt(
                Math.floor(Math.random() * chars.length),
            );
        }
        form.password = pwd;
        showPassword = true;
    }
</script>

<svelte:head>
    <title>Tambah User | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Tambah User" menuItems={adminMenu}>
    <BackButton
        href="/admin/users"
        label="Kembali ke Daftar User"
    />

    <!-- Stepper -->
    <div class="max-w-3xl mx-auto mb-5">
        <div class="flex items-center gap-2 sm:gap-3">
            <div class="flex items-center gap-2 flex-shrink-0">
                <div
                    class="w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs transition-all {step ===
                    1
                        ? 'bg-pink-dark text-white shadow-md shadow-pink/30'
                        : 'bg-green text-white'}"
                >
                    {#if step > 1}
                        <svg
                            class="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="3"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    {:else}
                        1
                    {/if}
                </div>
                <span
                    class="text-xs sm:text-sm font-bold transition-colors {step ===
                    1
                        ? 'text-dark'
                        : 'text-gray-400'}"
                >
                    Pilih Role
                </span>
            </div>

            <div
                class="flex-1 h-0.5 rounded-full transition-colors {step > 1
                    ? 'bg-green'
                    : 'bg-gray-200'}"
            ></div>

            <div class="flex items-center gap-2 flex-shrink-0">
                <div
                    class="w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs transition-all {step ===
                    2
                        ? 'bg-pink-dark text-white shadow-md shadow-pink/30'
                        : 'bg-gray-200 text-gray-500'}"
                >
                    2
                </div>
                <span
                    class="text-xs sm:text-sm font-bold transition-colors {step ===
                    2
                        ? 'text-dark'
                        : 'text-gray-400'}"
                >
                    Isi Data
                </span>
            </div>
        </div>
    </div>

    <!-- ==========================================
         STEP 1: Pilih Role
    ========================================== -->
    {#if step === 1}
        <div class="max-w-3xl mx-auto">
            <div
                class="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8"
            >
                <div class="text-center mb-6">
                    <h2 class="text-xl font-extrabold text-dark mb-1">
                        Pilih Role User
                    </h2>
                    <p class="text-xs text-gray-500">
                        Client tidak bisa dibuat di sini — client
                        register mandiri.
                    </p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onclick={() => selectRole('admin')}
                        class="group text-left p-5 rounded-2xl border-2 border-gray-200 hover:border-purple hover:bg-purple/5 hover:shadow-lg transition-all"
                    >
                        <div
                            class="w-11 h-11 rounded-2xl bg-purple/10 text-purple flex items-center justify-center mb-3 group-hover:bg-purple group-hover:text-white group-hover:scale-110 transition-all"
                        >
                            <svg
                                class="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                            </svg>
                        </div>
                        <h3 class="text-base font-extrabold text-dark mb-1">
                            Admin
                        </h3>
                        <p
                            class="text-xs text-gray-500 leading-relaxed"
                        >
                            Pengelola platform. Bisa mengelola user,
                            mitra, dan client.
                        </p>
                    </button>

                    <button
                        type="button"
                        onclick={() => selectRole('mitra')}
                        class="group text-left p-5 rounded-2xl border-2 border-gray-200 hover:border-blue hover:bg-blue/5 hover:shadow-lg transition-all"
                    >
                        <div
                            class="w-11 h-11 rounded-2xl bg-blue/10 text-blue flex items-center justify-center mb-3 group-hover:bg-blue group-hover:text-white group-hover:scale-110 transition-all"
                        >
                            <svg
                                class="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                            </svg>
                        </div>
                        <h3 class="text-base font-extrabold text-dark mb-1">
                            Mitra
                        </h3>
                        <p
                            class="text-xs text-gray-500 leading-relaxed"
                        >
                            Penyedia layanan travel. Punya profile
                            usaha dan bisa kelola trip.
                        </p>
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- ==========================================
         STEP 2: Form
    ========================================== -->
    {#if step === 2}
        <div class="max-w-3xl mx-auto">
            <!-- Error Alert -->
            {#if errorCount > 0}
                <div
                    class="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-3"
                >
                    <svg
                        class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
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
                            Silakan periksa kembali data yang Anda
                            masukkan.
                        </p>
                    </div>
                </div>
            {/if}

            <div
                class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
            >
                <!-- Header Card -->
                <div
                    class="p-5 sm:p-6 border-b border-gray-100 flex items-start justify-between gap-4"
                >
                    <div class="flex items-center gap-3 min-w-0">
                        <div
                            class="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0
                                {role === 'admin'
                                ? 'bg-purple/10 text-purple'
                                : 'bg-blue/10 text-blue'}"
                        >
                            {#if role === 'admin'}
                                <svg
                                    class="w-5 h-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                    />
                                </svg>
                            {:else}
                                <svg
                                    class="w-5 h-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                    />
                                </svg>
                            {/if}
                        </div>
                        <div class="min-w-0">
                            <h2
                                class="text-lg font-extrabold text-dark truncate"
                            >
                                Buat Akun {role === 'admin'
                                    ? 'Admin'
                                    : 'Mitra'}
                            </h2>
                            <p class="text-xs text-gray-500 truncate">
                                {role === 'admin'
                                    ? 'Isi data dasar untuk akun admin baru.'
                                    : 'Isi data dasar dan informasi usaha mitra.'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onclick={backToStep1}
                        class="text-xs font-bold text-gray-500 hover:text-pink-text transition-colors whitespace-nowrap flex-shrink-0"
                    >
                        Ganti Role
                    </button>
                </div>

                <form onsubmit={handleSubmit}>
                    <!-- === DATA AKUN === -->
                    <div class="p-5 sm:p-6 border-b border-gray-100">
                        <div class="flex items-center gap-2 mb-4">
                            <div
                                class="w-7 h-7 rounded-lg bg-purple/10 text-purple flex items-center justify-center flex-shrink-0"
                            >
                                <svg
                                    class="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                </svg>
                            </div>
                            <h3
                                class="text-sm font-extrabold text-dark uppercase tracking-wider"
                            >
                                Data Akun
                            </h3>
                        </div>

                        <div class="space-y-4">
                            <div
                                class="grid grid-cols-1 sm:grid-cols-2 gap-4"
                            >
                                <div>
                                    <label
                                        for="name"
                                        class="block text-xs font-bold text-dark mb-1.5"
                                    >
                                        Nama
                                        <span class="text-pink"
                                            >*</span
                                        >
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        bind:value={form.name}
                                        required
                                        placeholder="Nama lengkap"
                                        class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                                            {errors.name
                                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                                    />
                                    {#if errors.name}
                                        <p
                                            class="text-pink text-[11px] mt-1 font-bold"
                                        >
                                            {errors.name}
                                        </p>
                                    {/if}
                                </div>

                                <div>
                                    <label
                                        for="email"
                                        class="block text-xs font-bold text-dark mb-1.5"
                                    >
                                        Email
                                        <span class="text-pink"
                                            >*</span
                                        >
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        bind:value={form.email}
                                        required
                                        placeholder="email@contoh.com"
                                        class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                                            {errors.email
                                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                                    />
                                    {#if errors.email}
                                        <p
                                            class="text-pink text-[11px] mt-1 font-bold"
                                        >
                                            {errors.email}
                                        </p>
                                    {/if}
                                </div>
                            </div>

                            <div>
                                <label
                                    for="username"
                                    class="block text-xs font-bold text-dark mb-1.5"
                                >
                                    Username
                                    <span class="text-gray-400 font-normal"
                                        >(opsional)</span
                                    >
                                </label>
                                <div class="relative">
                                    <span
                                        class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none"
                                        >@</span
                                    >
                                    <input
                                        id="username"
                                        type="text"
                                        bind:value={form.username}
                                        placeholder="username unik"
                                        class="w-full pl-9 pr-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                                            {errors.username
                                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                                    />
                                </div>
                                {#if errors.username}
                                    <p
                                        class="text-pink text-[11px] mt-1 font-bold"
                                    >
                                        {errors.username}
                                    </p>
                                {/if}
                            </div>

                            <div>
                                <label
                                    for="password"
                                    class="block text-xs font-bold text-dark mb-1.5"
                                >
                                    Password
                                    <span class="text-gray-400 font-normal"
                                        >(kosongkan untuk
                                        auto-generate)</span
                                    >
                                </label>
                                <div class="flex gap-2">
                                    <div class="relative flex-1">
                                        <input
                                            id="password"
                                            type={showPassword
                                                ? 'text'
                                                : 'password'}
                                            bind:value={form.password}
                                            placeholder="Minimal 8 karakter"
                                            class="w-full px-4 py-2.5 pr-10 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                                                {errors.password
                                                ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                                : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                                        />
                                        <button
                                            type="button"
                                            onclick={() =>
                                                (showPassword =
                                                    !showPassword)}
                                            class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-dark transition-colors"
                                            aria-label="Toggle password"
                                        >
                                            <svg
                                                class="w-4 h-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                stroke-width="2"
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
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onclick={generatePassword}
                                        class="px-4 py-2.5 rounded-xl bg-gray-100 text-dark font-bold text-xs hover:bg-gray-200 transition-colors whitespace-nowrap"
                                    >
                                        Generate
                                    </button>
                                </div>
                                {#if errors.password}
                                    <p
                                        class="text-pink text-[11px] mt-1 font-bold"
                                    >
                                        {errors.password}
                                    </p>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <!-- === DATA USAHA (Mitra) === -->
                    {#if role === 'mitra'}
                        <div class="p-5 sm:p-6 border-b border-gray-100">
                            <div class="flex items-center gap-2 mb-4">
                                <div
                                    class="w-7 h-7 rounded-lg bg-blue/10 text-blue flex items-center justify-center flex-shrink-0"
                                >
                                    <svg
                                        class="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                        />
                                    </svg>
                                </div>
                                <h3
                                    class="text-sm font-extrabold text-dark uppercase tracking-wider"
                                >
                                    Data Usaha
                                    <span
                                        class="text-gray-400 font-normal normal-case"
                                        >(opsional)</span
                                    >
                                </h3>
                            </div>

                            <div class="space-y-4">
                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 gap-4"
                                >
                                    <div>
                                        <label
                                            for="nama_penyedia_usaha"
                                            class="block text-xs font-bold text-dark mb-1.5"
                                            >Nama Usaha</label
                                        >
                                        <input
                                            id="nama_penyedia_usaha"
                                            type="text"
                                            bind:value={
                                                form.nama_penyedia_usaha
                                            }
                                            placeholder="PT Contoh Travel"
                                            class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            for="nomor_identitas"
                                            class="block text-xs font-bold text-dark mb-1.5"
                                            >Nomor Identitas
                                            (NIK/NPWP)</label
                                        >
                                        <input
                                            id="nomor_identitas"
                                            type="text"
                                            bind:value={
                                                form.nomor_identitas
                                            }
                                            placeholder="1234567890"
                                            class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        for="telepon"
                                        class="block text-xs font-bold text-dark mb-1.5"
                                        >Telepon</label
                                    >
                                    <input
                                        id="telepon"
                                        type="text"
                                        bind:value={form.telepon}
                                        placeholder="+62 812 3456 7890"
                                        class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                    />
                                </div>

                                <div>
                                    <label
                                        for="alamat"
                                        class="block text-xs font-bold text-dark mb-1.5"
                                        >Alamat</label
                                    >
                                    <textarea
                                        id="alamat"
                                        bind:value={form.alamat}
                                        rows="2"
                                        placeholder="Alamat lengkap"
                                        class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all resize-none"
                                    ></textarea>
                                </div>

                                <div
                                    class="grid grid-cols-1 sm:grid-cols-3 gap-4"
                                >
                                    <div>
                                        <label
                                            for="provinsi"
                                            class="block text-xs font-bold text-dark mb-1.5"
                                            >Provinsi</label
                                        >
                                        <input
                                            id="provinsi"
                                            type="text"
                                            bind:value={form.provinsi}
                                            placeholder="Contoh: Bali"
                                            class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            for="kota"
                                            class="block text-xs font-bold text-dark mb-1.5"
                                            >Kota</label
                                        >
                                        <input
                                            id="kota"
                                            type="text"
                                            bind:value={form.kota}
                                            placeholder="Contoh: Denpasar"
                                            class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            for="kode_pos"
                                            class="block text-xs font-bold text-dark mb-1.5"
                                            >Kode Pos</label
                                        >
                                        <input
                                            id="kode_pos"
                                            type="text"
                                            bind:value={form.kode_pos}
                                            placeholder="80119"
                                            class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        for="deskripsi"
                                        class="block text-xs font-bold text-dark mb-1.5"
                                        >Deskripsi Usaha</label
                                    >
                                    <textarea
                                        id="deskripsi"
                                        bind:value={form.deskripsi}
                                        rows="2"
                                        placeholder="Ceritakan singkat tentang usaha Anda..."
                                        class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all resize-none"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    {/if}

                    <!-- === ACTIONS === -->
                    <div
                        class="p-4 sm:p-5 bg-gray-50/50 flex flex-col-reverse sm:flex-row gap-2"
                    >
                        <button
                            type="button"
                            onclick={backToStep1}
                            class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all"
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
                                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                />
                            </svg>
                            Kembali
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {#if processing}
                                <svg
                                    class="w-4 h-4 animate-spin"
                                    fill="none"
                                    viewBox="0 0 24 24"
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
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                Buat User
                            {/if}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}
</DashboardLayout>