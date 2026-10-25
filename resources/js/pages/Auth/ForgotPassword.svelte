<script>
    import { inertia, router, page } from '@inertiajs/svelte';

    let email = $state("");
    let errors = $state({});
    let processing = $state(false);
    let countdown = $state(0);

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

    function handleSubmit(e) {
        e.preventDefault();
        errors = {};
        processing = true;

        router.post('/forgot-password', { email }, {
            onError: (err) => {
                errors = err;
                processing = false;
            },
            onSuccess: () => {
                // Flash status akan otomatis terbaca dari page.props.flash.status
                email = "";
                processing = false;
            },
            onFinish: () => {
                processing = false;
            }
        });
    }
</script>

<svelte:head>
    <title>Lupa Password | Titiktemu</title>
</svelte:head>

<div class="min-h-screen bg-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">

    <!-- Efek Cahaya / Glow -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div class="absolute -top-32 -left-20 w-[400px] h-[400px] bg-blue rounded-full filter blur-[120px] opacity-20"></div>
        <div class="absolute bottom-10 right-0 w-[500px] h-[500px] bg-pink rounded-full filter blur-[130px] opacity-20"></div>
        <div class="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>
    </div>

    <!-- Tombol Kembali -->
    <!-- ✅ FIX A11Y: hapus aria-label yang tidak cocok dengan teks visible.
         Teks "Kembali ke Login" sudah cukup deskriptif untuk screen reader.
         WCAG 2.5.3: teks visible harus jadi bagian dari accessible name. -->
    <div class="absolute top-6 left-4 sm:left-8 z-20">
        <a href="/login" use:inertia class="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg transform hover:-translate-y-0.5">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Login
        </a>
    </div>

    <!-- Header -->
    <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 class="mt-6 text-center text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Pemulihan<span class="text-sun">.</span>
        </h2>
        <p class="mt-3 text-center text-sm sm:text-base text-gray-300 font-medium px-4">
            Masukkan email Anda, dan kami akan mengirimkan tautan untuk mengatur ulang password Anda.
        </p>
    </div>

    <!-- Kotak Form -->
    <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div class="bg-white py-10 px-6 shadow-[0_0_40px_rgba(0,0,0,0.3)] sm:rounded-[2.5rem] sm:px-10 border-4 border-white/10">

            <!-- Flash Sukses -->
            {#if page.props.flash?.status}
                <div class="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-2xl flex items-start gap-3">
                    <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    <p class="text-sm text-green-700 font-bold">{page.props.flash.status}</p>
                </div>
            {/if}

            <!-- Flash Error Global -->
            {#if page.props.flash?.error}
                <div class="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-3">
                    <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                    <p class="text-sm text-red-700 font-bold">{page.props.flash.error}</p>
                </div>
            {/if}

            <form onsubmit={handleSubmit} class="space-y-6">
                <!-- Input Email -->
                <div>
                    <label for="email" class="block text-sm font-extrabold text-dark mb-2">Alamat Email</label>
                    <input
                        id="email"
                        type="email"
                        bind:value={email}
                        required
                        autocomplete="email"
                        placeholder="budi@email.com"
                        class="appearance-none block w-full px-5 py-3.5 border border-gray-200 rounded-2xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue focus:bg-white transition-all sm:text-sm font-medium"
                    >
                    {#if errors.email}
                        <p class="text-pink text-xs mt-1.5 font-bold">{errors.email}</p>
                    {/if}
                </div>

                <!-- Tombol Submit -->
                <button
                    type="submit"
                    disabled={processing || countdown > 0}
                    class="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-full shadow-lg text-base font-bold text-white bg-blue-dark hover:bg-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-dark transition-all transform hover:-translate-y-1 mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {#if countdown > 0}
                        Tunggu {countdown} detik...
                    {:else if processing}
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Mengirim Tautan...
                    {:else}
                        Kirim Tautan Pemulihan
                    {/if}
                </button>
            </form>

            <!-- Info Tambahan -->
            <div class="mt-6 text-center text-xs text-gray-600 font-medium">
                Tautan pemulihan akan berlaku selama 60 menit.
            </div>
        </div>

        <!-- Copyright -->
        <p class="text-center text-xs text-gray-500 mt-8 font-medium">
            &copy; 2026 Hak Cipta Titiktemu. Dilindungi Undang-Undang.
        </p>
    </div>
</div>