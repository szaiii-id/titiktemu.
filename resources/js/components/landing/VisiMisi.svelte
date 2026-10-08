<script>
    // Data Visi dan Misi
    const misiList = [
        {
            title: "Digitalisasi Terpadu",
            desc: "Mengintegrasikan seluruh dokumen perjanjian dan kerja sama kedalam satu database yang aman, terpusat, dan mudah diakses.",
            // Ikon Database / Server
            iconPath: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75"
        },
        {
            title: "Transparansi & Akuntabilitas",
            desc: "Menyediakan sistem monitoring status implementasi kerja sama secara *real-time* untuk evaluasi kinerja yang akurat.",
            // Ikon Grafik / Analitik
            iconPath: "M3 13.5l6.75-6.75L15 12l5.25-5.25m0 0H16.5m3.75 0V10.5"
        },
        {
            title: "Kolaborasi Mitra Global",
            desc: "Mempermudah koordinasi antar instansi dan pihak ketiga melalui alur kerja digital yang cepat, efisien, dan tanpa hambatan birokrasi.",
            // Ikon Grup / Kolaborasi
            iconPath: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
        }
    ];
</script>

<!-- ID "visimisi" agar tersambung dengan navigasi Navbar -->
<section id="visimisi" class="py-28 bg-white relative overflow-hidden border-t border-gray-100 scroll-mt-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <!-- Header Section -->
        <div class="text-center max-w-3xl mx-auto mb-20">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple/5 border border-purple/10 mb-4">
                <span class="text-xs font-extrabold text-purple uppercase tracking-wider">Komitmen Kami</span>
            </div>
            <h2 class="text-4xl sm:text-5xl font-extrabold text-dark tracking-tight mb-6">
                Visi & <span class="text-purple">Misi</span> Siperjaka
            </h2>
            <p class="text-gray-600 text-lg leading-relaxed">
                Mendorong tata kelola kerja sama yang lebih profesional, modern, dan berdampak nyata bagi kemajuan bersama.
            </p>
        </div>

        <!-- Grid Layout: Visi di Kiri (Lebar 5), Misi di Kanan (Lebar 7) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            
            <!-- KOTAK VISI (Warna latar belakang gelap/dark agar kontras dan elegan) -->
            <div class="lg:col-span-5 bg-dark text-white rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                <!-- Efek cahaya pendar dekoratif di dalam kartu Visi -->
                <div class="absolute -top-24 -right-24 w-64 h-64 bg-purple/30 rounded-full filter blur-[80px] pointer-events-none"></div>
                <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-sun/20 rounded-full filter blur-[80px] pointer-events-none"></div>

                <div class="relative z-10">
                    <span class="text-xs font-extrabold text-sun uppercase tracking-widest block mb-4">Pernyataan Visi</span>
                    <h3 class="text-3xl font-extrabold text-white mb-6 leading-snug">
                        "Menjadi platform rujukan utama dalam tata kelola dan implementasi kerja sama berbasis digital yang transparan, akuntabel, dan terpercaya."
                    </h3>
                </div>

                <div class="relative z-10 pt-8 border-t border-gray-800 flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-sun font-extrabold text-xl">
                        V
                    </div>
                    <div>
                        <p class="font-bold text-white">Visi Utama</p>
                        <p class="text-xs text-gray-400">Siperjaka 2026 & Seterusnya</p>
                    </div>
                </div>
            </div>

            <!-- KOTAK-KOTAK MISI (3 Poin Utama di Kanan) -->
            <div class="lg:col-span-7 flex flex-col justify-between space-y-4">
                {#each misiList as item, index}
                    <div class="bg-gray-50/70 border border-gray-100 rounded-3xl p-6 sm:p-7 flex items-start gap-5 transition-all duration-300 hover:bg-white hover:shadow-xl hover:border-purple/20 group">
                        
                        <!-- Nomor & Ikon -->
                        <div class="flex-shrink-0 w-14 h-14 rounded-2xl bg-purple/10 text-purple flex items-center justify-center group-hover:bg-purple group-hover:text-white transition-all duration-300">
                            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d={item.iconPath} />
                            </svg>
                        </div>

                        <!-- Teks Penjelasan Misi -->
                        <div>
                            <div class="flex items-center gap-3 mb-1">
                                <span class="text-xs font-extrabold text-purple tracking-widest uppercase">Misi 0{index + 1}</span>
                            </div>
                            <h4 class="text-xl font-bold text-dark mb-2">{item.title}</h4>
                            <p class="text-gray-600 leading-relaxed text-sm sm:text-base">
                                {item.desc}
                            </p>
                        </div>

                    </div>
                {/each}
            </div>

        </div>

    </div>
</section>