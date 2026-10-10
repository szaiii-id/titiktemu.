<script>
    import { inertia, router, page } from '@inertiajs/svelte';

    let identitas = $state("");
    let password = $state("");
    let remember = $state(false);
    let errors = $state({});
    let processing = $state(false);
    let showPassword = $state(false);
    let countdown = $state(0);

    // Baca retry_after dari flash, mulai hitung mundur jika ada
    $effect(() => {
        const retry = page.props.flash?.retry_after;
        if (retry && retry > 0) {
            startCountdown(retry);
        }
    });

    function startCountdown(seconds) {
        countdown = seconds;
        const interval = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
                clearInterval(interval);
            }
        }, 1000);
    }

    function handleLogin(e) {
        e.preventDefault();
        errors = {};
        processing = true;

        router.post('/login', {
            identitas: identitas,
            password: password,
            remember: remember
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
    <title>Login | Titiktemu</title>
</svelte:head>

<div class="min-h-screen bg-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">

    <!-- Efek Cahaya / Glow -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div class="absolute -top-32 -left-20 w-[400px] h-[400px] bg-blue rounded-full filter blur-[120px] opacity-20"></div>
        <div class="absolute bottom-10 right-0 w-[500px] h-[500px] bg-pink rounded-full filter blur-[130px] opacity-20"></div>
        <div class="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>
    </div>

    <!-- Tombol Kembali -->
    <div class="absolute top-6 left-4 sm:left-8 z-20">
        <a href="/" use:inertia aria-label="Kembali ke beranda" class="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg transform hover:-translate-y-0.5">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali
        </a>
    </div>

    <!-- Header Logo & Teks -->
    <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 class="mt-6 text-center text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Login<span class="text-sun">.</span>
        </h2>
        <p class="mt-3 text-center text-sm sm:text-base text-gray-300 font-medium">
            Selamat datang kembali. Silakan masuk<br>untuk melanjutkan.
        </p>
    </div>

    <!-- Kotak Form Login -->
    <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div class="bg-white py-10 px-6 shadow-[0_0_40px_rgba(0,0,0,0.3)] sm:rounded-[2.5rem] sm:px-10 border-4 border-white/10">

            <!-- Flash Message Sukses -->
            {#if page.props.flash?.status}
                <div class="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-2xl flex items-start gap-3">
                    <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    <p class="text-sm text-green-700 font-bold">{page.props.flash.status}</p>
                </div>
            {/if}

            <!-- Flash Message Error Global -->
            {#if page.props.flash?.error}
                <div class="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-3">
                    <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                    <p class="text-sm text-red-700 font-bold">{page.props.flash.error}</p>
                </div>
            {/if}

            <form onsubmit={handleLogin} class="space-y-5">
                <!-- Input Username / Email -->
                <div>
                    <label for="identitas" class="block text-sm font-extrabold text-dark mb-2">Username atau Email</label>
                    <input
                        id="identitas"
                        type="text"
                        bind:value={identitas}
                        required
                        autocomplete="username"
                        placeholder="budi@email.com atau budisantoso"
                        class="appearance-none block w-full px-5 py-3.5 border border-gray-200 rounded-2xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue focus:bg-white transition-all sm:text-sm font-medium"
                    >
                    {#if errors.identitas}
                        <p class="text-pink text-xs mt-1.5 font-bold">{errors.identitas}</p>
                    {/if}
                </div>

                <!-- Input Password dengan Toggle -->
                <div>
                    <label for="password" class="block text-sm font-extrabold text-dark mb-2">Password</label>
                    <div class="relative">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            bind:value={password}
                            required
                            autocomplete="current-password"
                            placeholder="Masukkan password Anda"
                            class="appearance-none block w-full px-5 py-3.5 pr-12 border border-gray-200 rounded-2xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue focus:bg-white transition-all sm:text-sm font-medium"
                        >
                        <button
                            type="button"
                            onclick={() => showPassword = !showPassword}
                            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                            class="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-600 hover:text-dark transition-colors"
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

                <!-- Lupa Password & Remember Me -->
                <div class="flex items-center justify-between pt-1">
                    <div class="flex items-center">
                        <input id="remember-me" type="checkbox" bind:checked={remember} class="h-4 w-4 text-blue focus:ring-blue border-gray-300 rounded cursor-pointer">
                        <label for="remember-me" class="ml-2 block text-sm text-gray-600 font-bold cursor-pointer">Ingat saya</label>
                    </div>
                    <div class="text-sm">
                        <a href="/forgot-password" use:inertia class="font-bold text-blue hover:text-pink transition-colors">
                            Lupa password?
                        </a>
                    </div>
                </div>

                <!-- Tombol Login -->
                <button
                    type="submit"
                    disabled={processing || countdown > 0}
                    class="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-full shadow-lg text-base font-bold text-white bg-pink-dark hover:bg-sun-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-dark transition-all transform hover:-translate-y-1 mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {#if countdown > 0}
                        Tunggu {countdown} detik...
                    {:else if processing}
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memproses...
                    {:else}
                        Masuk ke Sistem
                    {/if}
                </button>
            </form>

            <!-- Teks Register -->
            <div class="mt-8 text-center text-sm">
                <span class="text-gray-500 font-medium">Belum punya akun?</span>
                <a href="/register" use:inertia class="font-bold text-blue hover:text-pink transition-colors ml-1">Daftar sekarang</a>
            </div>

            <!-- Separator -->
            <div class="mt-6">
                <div class="relative">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-gray-200"></div>
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="px-4 bg-white text-gray-600 font-bold uppercase tracking-wider text-xs">Atau akses via</span>
                    </div>
                </div>

                <!-- Tombol Login with Google -->
                <div class="mt-6">
                    <a href="/auth/google" class="w-full flex justify-center items-center gap-3 py-3.5 px-4 border-2 border-gray-100 rounded-full shadow-sm bg-white text-sm font-extrabold text-dark hover:bg-gray-50 hover:border-blue/30 transition-all group">
                        <svg class="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Login with Google
                    </a>
                </div>
            </div>

        </div>

        <!-- Copyright -->
        <p class="text-center text-xs text-gray-500 mt-8 font-medium">
            &copy; 2026 Hak Cipta Titiktemu. Dilindungi Undang-Undang.
        </p>
    </div>
</div>