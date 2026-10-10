<script>
    import { inertia } from '@inertiajs/svelte';
</script>

<svelte:head>
    <title>Dashboard Client | Titiktemu</title>
</svelte:head>

<div class="min-h-screen bg-dark text-gray-200 p-8">
    <div class="max-w-4xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
        <div class="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <div>
                <h1 class="text-3xl font-extrabold text-white">Dashboard Client<span class="text-sun">.</span></h1>
                <p class="text-sm text-gray-400 mt-1">Selamat datang di area personal Anda.</p>
            </div>
            
            <form action="/logout" method="POST">
                <button type="submit" class="bg-pink hover:bg-sun text-white font-bold px-5 py-2.5 rounded-full transition-all text-sm shadow-md">
                    Keluar
                </button>
            </form>
        </div>

        <div class="bg-dark/50 border border-white/10 rounded-2xl p-6">
            <h2 class="text-lg font-bold text-sun mb-2">Beranda Pengguna</h2>
            <p class="text-sm text-gray-300">Ini adalah halaman placeholder untuk Client. Anda berhasil masuk menggunakan akun Client Anda!</p>
        </div>
    </div>
</div>