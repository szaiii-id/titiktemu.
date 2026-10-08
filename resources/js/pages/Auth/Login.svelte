<script>
    let identitas = $state("");
    let password = $state("");

    function handleLogin(e) {
        e.preventDefault();
        console.log("Login dengan:", identitas, password);
    }
</script>

<svelte:head>
    <title>Login | Titiktemu</title>
</svelte:head>

<!-- Latar belakang disamakan dengan tema gelap elegan Siperjaka -->
<div class="min-h-screen bg-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
    
    <!-- Efek Cahaya / Glow (Senada dengan Hero Landing Page) -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div class="absolute -top-32 -left-20 w-[400px] h-[400px] bg-blue rounded-full filter blur-[120px] opacity-20"></div>
        <div class="absolute bottom-10 right-0 w-[500px] h-[500px] bg-pink rounded-full filter blur-[130px] opacity-20"></div>
        <!-- Dot Pattern -->
        <div class="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>
    </div>

    <!-- Tombol Kembali (Diubah menjadi bentuk Button Kapsul Melayang) -->
    <div class="absolute top-6 left-4 sm:left-8 z-20">
        <a href="/" class="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg transform hover:-translate-y-0.5">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali
        </a>
    </div>

    <!-- Header Logo & Teks -->
    <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 class="mt-6 text-center text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Titiktemu<span class="text-sun">.</span>
        </h2>
        <p class="mt-3 text-center text-sm sm:text-base text-gray-300 font-medium">
            Sistem Informasi Implementasi <br> Perjanjian & Kerja Sama
        </p>
    </div>

    <!-- Kotak Form Login -->
    <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div class="bg-white py-10 px-6 shadow-[0_0_40px_rgba(0,0,0,0.3)] sm:rounded-[2.5rem] sm:px-10 border-4 border-white/10">
            
            <form on:submit={handleLogin} class="space-y-6">
                <!-- Input Username / Email -->
                <div>
                    <label for="identitas" class="block text-sm font-extrabold text-dark mb-2">Username atau Email</label>
                    <input 
                        id="identitas" 
                        type="text" 
                        bind:value={identitas}
                        required 
                        placeholder="Masukkan username / email"
                        class="appearance-none block w-full px-5 py-3.5 border border-gray-200 rounded-2xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue focus:bg-white transition-all sm:text-sm font-medium"
                    >
                </div>

                <!-- Input Password -->
                <div>
                    <label for="password" class="block text-sm font-extrabold text-dark mb-2">Password</label>
                    <input 
                        id="password" 
                        type="password" 
                        bind:value={password}
                        required 
                        placeholder="••••••••"
                        class="appearance-none block w-full px-5 py-3.5 border border-gray-200 rounded-2xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue focus:bg-white transition-all sm:text-sm font-medium"
                    >
                </div>

                <!-- Lupa Password & Remember Me -->
                <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center">
                        <input id="remember-me" type="checkbox" class="h-4 w-4 text-blue focus:ring-blue border-gray-300 rounded cursor-pointer">
                        <label for="remember-me" class="ml-2 block text-sm text-gray-600 font-bold cursor-pointer">Ingat saya</label>
                    </div>
                    <div class="text-sm">
                        <a href="#" class="font-bold text-blue hover:text-pink transition-colors">Lupa password?</a>
                    </div>
                </div>

                <!-- Tombol Login Biasa -->
                <button type="submit" class="w-full flex justify-center py-4 px-4 border border-transparent rounded-full shadow-lg text-base font-bold text-white bg-pink hover:bg-sun focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink transition-all transform hover:-translate-y-1 mt-4">
                    Masuk ke Sistem
                </button>
            </form>

            <!-- Separator -->
            <div class="mt-8">
                <div class="relative">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-gray-200"></div>
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="px-4 bg-white text-gray-400 font-bold uppercase tracking-wider text-xs">Atau akses via</span>
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
        
        <!-- Copyright Text di Bawah Form -->
        <p class="text-center text-xs text-gray-500 mt-8 font-medium">
            &copy; 2026 Hak Cipta Siperjaka. Dilindungi Undang-Undang.
        </p>
    </div>
</div>