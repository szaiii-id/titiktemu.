<script>
    import { inertia, router, page } from '@inertiajs/svelte';

    // Menerima parameter dari Laravel Controller ($token dan $email)
    let { token, email: propEmail, errors: propErrors } = $props();

    // Data Form
    let email = $state(propEmail || "");
    let password = $state("");
    let password_confirmation = $state("");

    let errors = $state(propErrors || {});
    let processing = $state(false);
    let showPassword = $state(false);
    let showPasswordConfirmation = $state(false);
    let countdown = $state(0);

    // Cek apakah password dan konfirmasi cocok
    let passwordMismatch = $derived(
        password_confirmation.length > 0 && password !== password_confirmation
    );

    // Baca retry_after dari flash, mulai hitung mundur jika ada
    $effect(() => {
        const retry = page.props.flash?.retry_after;
        if (retry && retry > 0) {
            countdown = retry;
            const interval = setInterval(() => {
                countdown--;
                if (countdown <= 0) clearInterval(interval);
            }, 1000);
            return () => clearInterval(interval);
        }
    });

    function handleReset(e) {
        e.preventDefault();
        errors = {};
        processing = true;

        router.post('/reset-password', {
            token: token,
            email: email,
            password: password,
            password_confirmation: password_confirmation
        }, {
            onError: (err) => {
                errors = err;
                processing = false;
            },
            onFinish: () => {
                processing = false;
            }
        });
    }
</script>

<svelte:head>
    <title>Reset Password | Titiktemu</title>
</svelte:head>

<div class="min-h-screen bg-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">

    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div class="absolute -top-32 -left-20 w-[400px] h-[400px] bg-blue rounded-full filter blur-[120px] opacity-20"></div>
        <div class="absolute bottom-10 right-0 w-[500px] h-[500px] bg-pink rounded-full filter blur-[130px] opacity-20"></div>
        <div class="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>
    </div>

    <!-- Header -->
    <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10 mt-8">
        <h2 class="mt-6 text-center text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Reset Sandi<span class="text-sun">.</span>
        </h2>
        <p class="mt-3 text-center text-sm sm:text-base text-gray-300 font-medium px-4">
            Silakan buat password baru Anda untuk mengamankan kembali akun Titiktemu Anda.
        </p>
    </div>

    <!-- Kotak Form -->
    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 mb-10">
        <div class="bg-white py-10 px-6 shadow-[0_0_40px_rgba(0,0,0,0.3)] sm:rounded-[2.5rem] sm:px-10 border-4 border-white/10">

            <!-- Flash Error Global -->
            {#if page.props.flash?.error}
                <div class="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-3">
                    <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                    <p class="text-sm text-red-700 font-bold">{page.props.flash.error}</p>
                </div>
            {/if}

            <form onsubmit={handleReset} class="space-y-5">

                <!-- Input Email (Readonly) -->
                <div>
                    <label for="email" class="block text-sm font-extrabold text-dark mb-2">Email</label>
                    <input
                        id="email"
                        type="email"
                        bind:value={email}
                        readonly
                        autocomplete="email"
                        class="appearance-none block w-full px-5 py-3.5 border border-gray-200 rounded-2xl bg-gray-100 text-gray-500 cursor-not-allowed transition-all sm:text-sm font-bold"
                    >
                    {#if errors.email}
                        <p class="text-pink text-xs mt-1.5 font-bold">{errors.email}</p>
                    {/if}
                </div>

                <!-- Input Password Baru dengan Toggle -->
                <div>
                    <label for="password" class="block text-sm font-extrabold text-dark mb-2">Password Baru</label>
                    <div class="relative">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            bind:value={password}
                            required
                            autocomplete="new-password"
                            placeholder="Minimal 8 karakter"
                            class="appearance-none block w-full px-5 py-3.5 pr-12 border border-gray-200 rounded-2xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue focus:bg-white transition-all sm:text-sm font-medium"
                        >
                        <button
                            type="button"
                            onclick={() => showPassword = !showPassword}
                            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                            class="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-dark transition-colors"
                        >
                            {#if showPassword}
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            {:else}
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            {/if}
                        </button>
                    </div>
                    {#if errors.password}
                        <p class="text-pink text-xs mt-1.5 font-bold">{errors.password}</p>
                    {/if}
                </div>

                <!-- Input Konfirmasi Password dengan Toggle -->
                <div>
                    <label for="password_confirmation" class="block text-sm font-extrabold text-dark mb-2">Konfirmasi Password</label>
                    <div class="relative">
                        <input
                            id="password_confirmation"
                            type={showPasswordConfirmation ? "text" : "password"}
                            bind:value={password_confirmation}
                            required
                            autocomplete="new-password"
                            placeholder="Ulangi password baru"
                            class="appearance-none block w-full px-5 py-3.5 pr-12 border border-gray-200 rounded-2xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue focus:bg-white transition-all sm:text-sm font-medium"
                        >
                        <button
                            type="button"
                            onclick={() => showPasswordConfirmation = !showPasswordConfirmation}
                            aria-label={showPasswordConfirmation ? "Sembunyikan password" : "Tampilkan password"}
                            class="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-dark transition-colors"
                        >
                            {#if showPasswordConfirmation}
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            {:else}
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            {/if}
                        </button>
                    </div>

                    <!-- Peringatan jika tidak cocok -->
                    {#if passwordMismatch}
                        <p class="text-pink text-xs mt-1.5 font-bold">Konfirmasi password tidak cocok.</p>
                    {/if}

                    {#if errors.password_confirmation}
                        <p class="text-pink text-xs mt-1.5 font-bold">{errors.password_confirmation}</p>
                    {/if}
                </div>

                <!-- Tombol Submit -->
                <button
                    type="submit"
                    disabled={processing || countdown > 0 || passwordMismatch}
                    class="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-full shadow-lg text-base font-bold text-white bg-pink hover:bg-sun focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink transition-all transform hover:-translate-y-1 mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {#if countdown > 0}
                        Tunggu {countdown} detik...
                    {:else if processing}
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Menyimpan...
                    {:else}
                        Simpan Password Baru
                    {/if}
                </button>
            </form>

        </div>

        <!-- Copyright -->
        <p class="text-center text-xs text-gray-500 mt-8 font-medium">
            &copy; 2026 Hak Cipta Titiktemu. Dilindungi Undang-Undang.
        </p>
    </div>
</div>