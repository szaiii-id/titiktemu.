<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import { inertia, router, page } from '@inertiajs/svelte';
    import { calculatePasswordStrength, isPasswordMismatch } from '@/utils/passwordStrength';

    const menuItems = [
        {
            label: 'Dashboard',
            href: '/mitra/dashboard',
            icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
        },
        {
            label: 'Profile Usaha',
            href: '/mitra/profile',
            icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
        },
        {
            label: 'Ganti Password',
            href: '/mitra/password',
            icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
        },
    ];

    // Form
    let oldPassword = $state('');
    let password = $state('');
    let passwordConfirmation = $state('');

    let errors = $state<Record<string, string>>({});
    let processing = $state(false);
    let errorCount = $derived(Object.keys(errors).length);

    let showOldPassword = $state(false);
    let showPassword = $state(false);
    let showPasswordConfirmation = $state(false);

    let passwordStrength = $derived(calculatePasswordStrength(password));
    let passwordMismatch = $derived(
        isPasswordMismatch(password, passwordConfirmation)
    );

    // Cek kriteria password
    let hasMinLength = $derived(password.length >= 8);
    let hasLetter = $derived(/[a-zA-Z]/.test(password));
    let hasNumber = $derived(/\d/.test(password));
    let hasSymbol = $derived(/[^a-zA-Z0-9]/.test(password));

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        errors = {};
        processing = true;

        router.put('/mitra/password', {
            old_password: oldPassword,
            password,
            password_confirmation: passwordConfirmation,
        }, {
            onError: (err) => {
                errors = err as Record<string, string>;
                processing = false;
            },
            onSuccess: () => {
                oldPassword = '';
                password = '';
                passwordConfirmation = '';
            },
            onFinish: () => {
                processing = false;
            },
        });
    }

    let user = $derived(page.props.auth?.user);
</script>

<svelte:head>
    <title>Ganti Password | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Ganti Password" {menuItems}>
    <!-- Header -->
    <div class="mb-5">
        <h1 class="text-2xl font-extrabold text-dark">Ganti Password</h1>
        <p class="text-sm text-gray-500 mt-1">
            Pastikan password baru Anda kuat dan mudah diingat.
        </p>
    </div>

    <!-- NOTE: Flash Status sekarang dirender oleh DashboardLayout (global) -->

    <!-- Error Alert -->
    {#if errorCount > 0}
        <div class="mb-5 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-3">
            <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <div>
                <p class="text-sm text-red-700 font-bold">Terdapat {errorCount} kesalahan pada form</p>
                <p class="text-xs text-red-600 mt-0.5">Silakan periksa kembali data yang Anda masukkan.</p>
            </div>
        </div>
    {/if}

    <form onsubmit={handleSubmit} class="max-w-2xl mx-auto space-y-5">

        <!-- ==========================================
             CARD HEADER: Info User
        ========================================== -->
        <div class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-dark to-purple text-white flex items-center justify-center font-extrabold text-xl shadow-md flex-shrink-0">
                    {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div class="flex-1 min-w-0">
                    <!-- ✅ FIX A11Y: bg-pink/10 text-pink → bg-pink/20 text-pink-dark -->
                    <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink/20 text-pink-dark text-[10px] font-extrabold mb-1">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        KEAMANAN AKUN
                    </div>
                    <h2 class="text-base font-extrabold text-dark truncate">
                        {user?.name ?? 'User'}
                    </h2>
                    <p class="text-xs text-gray-500 truncate">@{user?.username ?? 'user'} · {user?.email ?? '-'}</p>
                </div>
            </div>
        </div>

        <!-- ==========================================
             CARD: Form Ganti Password
        ========================================== -->
        <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

            <!-- Section Header -->
            <div class="p-5 sm:p-6 border-b border-gray-100 flex items-center gap-3">
                <div class="w-9 h-9 rounded-2xl bg-yellow-100 text-yellow-700 flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                </div>
                <div>
                    <h3 class="text-base font-extrabold text-dark">Ganti Password</h3>
                    <p class="text-xs text-gray-500">Masukkan password lama & password baru</p>
                </div>
            </div>

            <!-- Section Body -->
            <div class="p-5 sm:p-6 space-y-5">

                <!-- Password Lama -->
                <div>
                    <label for="old_password" class="block text-xs font-bold text-dark mb-1.5">
                        Password Lama <span class="text-pink">*</span>
                    </label>
                    <div class="relative">
                        <input
                            id="old_password"
                            type={showOldPassword ? 'text' : 'password'}
                            bind:value={oldPassword}
                            required
                            autocomplete="current-password"
                            placeholder="Masukkan password lama Anda"
                            class="w-full px-4 py-2.5 pr-11 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                                {errors.old_password
                                    ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                    : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                        />
                        <button
                            type="button"
                            onclick={() => (showOldPassword = !showOldPassword)}
                            class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-pink-dark transition-colors"
                            aria-label="Toggle password"
                        >
                            {#if showOldPassword}
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            {:else}
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            {/if}
                        </button>
                    </div>
                    {#if errors.old_password}<p class="text-pink text-[11px] mt-1 font-bold">{errors.old_password}</p>{/if}
                </div>

                <!-- Divider -->
                <div class="border-t border-dashed border-gray-200"></div>

                <!-- Password Baru -->
                <div>
                    <label for="password" class="block text-xs font-bold text-dark mb-1.5">
                        Password Baru <span class="text-pink">*</span>
                    </label>
                    <div class="relative">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            bind:value={password}
                            required
                            autocomplete="new-password"
                            placeholder="Minimal 8 karakter"
                            class="w-full px-4 py-2.5 pr-11 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                                {errors.password
                                    ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                    : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                        />
                        <button
                            type="button"
                            onclick={() => (showPassword = !showPassword)}
                            class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-pink-dark transition-colors"
                            aria-label="Toggle password"
                        >
                            {#if showPassword}
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            {:else}
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            {/if}
                        </button>
                    </div>

                    <!-- Strength Bar -->
                    {#if password}
                        <div class="mt-3 flex items-center gap-2">
                            <div class="flex-1 flex gap-1">
                                {#each [1, 2, 3, 4] as bar}
                                    <div class="h-1.5 flex-1 rounded-full {bar <= passwordStrength.level ? passwordStrength.color : 'bg-gray-200'} transition-colors"></div>
                                {/each}
                            </div>
                            <span class="text-[11px] font-extrabold {passwordStrength.color.replace('bg-', 'text-')} whitespace-nowrap">
                                {passwordStrength.label}
                            </span>
                        </div>

                        <!-- Checklist Kriteria -->
                        <div class="mt-3 grid grid-cols-2 gap-2">
                            <div class="flex items-center gap-1.5 text-[11px]">
                                <span class="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center {hasMinLength ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}">
                                    {#if hasMinLength}
                                        <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    {:else}
                                        <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    {/if}
                                </span>
                                <span class="{hasMinLength ? 'text-green-700 font-bold' : 'text-gray-500'}">Min. 8 karakter</span>
                            </div>
                            <div class="flex items-center gap-1.5 text-[11px]">
                                <span class="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center {hasLetter ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}">
                                    {#if hasLetter}
                                        <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    {:else}
                                        <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    {/if}
                                </span>
                                <span class="{hasLetter ? 'text-green-700 font-bold' : 'text-gray-500'}">Huruf</span>
                            </div>
                            <div class="flex items-center gap-1.5 text-[11px]">
                                <span class="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center {hasNumber ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}">
                                    {#if hasNumber}
                                        <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    {:else}
                                        <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    {/if}
                                </span>
                                <span class="{hasNumber ? 'text-green-700 font-bold' : 'text-gray-500'}">Angka</span>
                            </div>
                            <div class="flex items-center gap-1.5 text-[11px]">
                                <span class="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center {hasSymbol ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}">
                                    {#if hasSymbol}
                                        <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    {:else}
                                        <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    {/if}
                                </span>
                                <span class="{hasSymbol ? 'text-green-700 font-bold' : 'text-gray-500'}">Simbol</span>
                            </div>
                        </div>
                    {/if}

                    {#if errors.password}<p class="text-pink text-[11px] mt-1.5 font-bold">{errors.password}</p>{/if}
                </div>

                <!-- Konfirmasi Password -->
                <div>
                    <label for="password_confirmation" class="block text-xs font-bold text-dark mb-1.5">
                        Konfirmasi Password Baru <span class="text-pink">*</span>
                    </label>
                    <div class="relative">
                        <input
                            id="password_confirmation"
                            type={showPasswordConfirmation ? 'text' : 'password'}
                            bind:value={passwordConfirmation}
                            required
                            autocomplete="new-password"
                            placeholder="Ulangi password baru Anda"
                            class="w-full px-4 py-2.5 pr-11 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                                {passwordMismatch || errors.password_confirmation
                                    ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                    : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                        />
                        <button
                            type="button"
                            onclick={() => (showPasswordConfirmation = !showPasswordConfirmation)}
                            class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-pink-dark transition-colors"
                            aria-label="Toggle password"
                        >
                            {#if showPasswordConfirmation}
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            {:else}
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            {/if}
                        </button>
                    </div>

                    {#if passwordMismatch}
                        <p class="text-pink text-[11px] mt-1.5 font-bold flex items-center gap-1">
                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                            </svg>
                            Konfirmasi password tidak cocok.
                        </p>
                    {/if}
                    {#if errors.password_confirmation}<p class="text-pink text-[11px] mt-1.5 font-bold">{errors.password_confirmation}</p>{/if}
                </div>
            </div>
        </div>

        <!-- ==========================================
             ACTIONS
        ========================================== -->
        <div class="flex flex-col-reverse sm:flex-row gap-2">
            <a
                href="/mitra/dashboard"
                use:inertia
                class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Batal
            </a>
            <button
                type="submit"
                disabled={processing || passwordMismatch}
                class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
                {#if processing}
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Menyimpan...
                {:else}
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Simpan Password Baru
                {/if}
            </button>
        </div>
    </form>
</DashboardLayout>