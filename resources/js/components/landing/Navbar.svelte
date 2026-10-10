<script>
    import { onMount } from 'svelte';
    import { inertia } from '@inertiajs/svelte';

    let isMobileMenuOpen = $state(false);
    let activeSection = $state('beranda');

    function toggleMenu() {
        isMobileMenuOpen = !isMobileMenuOpen;
    }

    // Menggunakan Scroll Event untuk deteksi yang lebih akurat
    onMount(() => {
        const handleScroll = () => {
            const sections = ['beranda', 'trip', 'visimisi', 'contact'];
            let currentSection = 'beranda'; // Default selalu beranda jika di paling atas

            for (const id of sections) {
                const el = document.getElementById(id);
                if (el) {
                    // Angka 200 adalah offset (jarak navbar dari atas). 
                    // Jika layar digulir melewati titik ini, menu akan berubah.
                    if (window.scrollY >= el.offsetTop - 200) {
                        currentSection = id;
                    }
                }
            }
            activeSection = currentSection;
        };

        // Pasang event listener saat di-scroll
        window.addEventListener('scroll', handleScroll);
        
        // Panggil sekali saat halaman pertama kali dimuat agar statusnya langsung akurat
        handleScroll();

        // Bersihkan saat komponen dilepas
        return () => window.removeEventListener('scroll', handleScroll);
    });
</script>

<!-- === FLOATING DYNAMIC ISLAND NAVBAR === -->
<header class="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[94%] md:w-[92%] max-w-6xl">
    <div class="bg-dark/95 backdrop-blur-xl border border-gray-700/50 shadow-2xl shadow-dark/20 rounded-full px-8 py-4 flex items-center justify-between transition-all duration-300">
        
        <!-- BAGIAN KIRI: Logo -->
        <div class="flex-1 flex justify-start">
            <a href="#beranda" class="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-1">
                Titiktemu<span class="text-sun">.</span>
            </a>
        </div>

        <!-- BAGIAN TENGAH: Menu Navigasi (Desktop) -->
        <nav class="hidden md:flex justify-center space-x-10">
            <a 
                href="#beranda" 
                class="text-base font-bold transition-colors {activeSection === 'beranda' ? 'text-sun' : 'text-gray-300 hover:text-sun'}"
            >
                Beranda
            </a>
            <a 
                href="#trip" 
                class="text-base font-bold transition-colors {activeSection === 'trip' ? 'text-sun' : 'text-gray-300 hover:text-sun'}"
            >
                Trip & Bundle
            </a>
            <a 
                href="#visimisi" 
                class="text-base font-bold transition-colors {activeSection === 'visimisi' ? 'text-sun' : 'text-gray-300 hover:text-sun'}"
            >
                Visi Misi
            </a>
            <a 
                href="#contact" 
                class="text-base font-bold transition-colors {activeSection === 'contact' ? 'text-sun' : 'text-gray-300 hover:text-sun'}"
            >
                Kontak
            </a>
        </nav>

        <!-- BAGIAN KANAN: Tombol Register, Login & Hamburger (Mobile) -->
        <div class="flex-1 flex justify-end items-center gap-3">
            
            <!-- Tombol Daftar (Desktop) -->
            <a href="/register" use:inertia class="hidden md:inline-flex bg-pink-dark text-white px-6 py-2.5 rounded-full text-base font-bold hover:bg-sun-dark transition-all shadow-md hover:shadow-lg hover:shadow-pink/30 transform hover:-translate-y-0.5">
                Daftar
            </a>

            <!-- Tombol Login (Desktop) -->
            <a href="/login" use:inertia class="hidden md:inline-flex bg-pink-dark text-white px-8 py-2.5 rounded-full text-base font-bold hover:bg-sun-dark transition-all shadow-md hover:shadow-lg hover:shadow-pink/30 transform hover:-translate-y-0.5">
                Login
            </a>

            <!-- Tombol Hamburger (Hanya tampil di HP) -->
            <button on:click={toggleMenu} class="md:hidden text-gray-300 hover:text-sun focus:outline-none p-1" aria-label="Buka menu navigasi">
                <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {#if isMobileMenuOpen}
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    {:else}
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    {/if}
                </svg>
            </button>
        </div>
    </div>

    <!-- MENU DROPDOWN MOBILE -->
    {#if isMobileMenuOpen}
        <div class="md:hidden mt-3 bg-dark/95 backdrop-blur-xl border border-gray-700/50 shadow-2xl rounded-3xl p-5 space-y-2">
            <a href="#beranda" class="block px-4 py-3 rounded-xl font-bold {activeSection === 'beranda' ? 'text-sun bg-white/10' : 'text-gray-300 hover:bg-white/10'} transition-colors">Beranda</a>
            <a href="#trip" class="block px-4 py-3 rounded-xl font-bold {activeSection === 'trip' ? 'text-sun bg-white/10' : 'text-gray-300 hover:bg-white/10'} transition-colors">Trip & Bundle</a>
            <a href="#visimisi" class="block px-4 py-3 rounded-xl font-bold {activeSection === 'visimisi' ? 'text-sun bg-white/10' : 'text-gray-300 hover:bg-white/10'} transition-colors">Visi Misi</a>
            <a href="#contact" class="block px-4 py-3 rounded-xl font-bold {activeSection === 'contact' ? 'text-sun bg-white/10' : 'text-gray-300 hover:bg-white/10'} transition-colors">Kontak</a>
            
            <!-- Area Tombol Register & Login (Mobile) -->
            <div class="pt-4 mt-2 border-t border-gray-700/50 flex flex-col gap-3">
                <a href="/register" use:inertia class="block text-center w-full bg-pink-dark text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-sun-dark transition-all">
                    Daftar Akun
                </a>
                <a href="/login" use:inertia class="block text-center w-full bg-pink-dark text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-sun-dark transition-all">
                    Login
                </a>
            </div>
        </div>
    {/if}
</header>