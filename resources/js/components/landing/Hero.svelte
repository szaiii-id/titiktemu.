<!-- Wrapper Hero: Ditambah padding atas (pt-32) agar tidak tertutup oleh navbar Dynamic Island -->
<section class="relative bg-white pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden min-h-[90vh] flex items-center">
    
    <!-- === EFEK CAHAYA (SOFT MESH GRADIENT) === -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div class="absolute -top-32 -left-20 w-[400px] h-[400px] bg-blue rounded-full filter blur-[120px] opacity-10 animate-pulse"></div>
        <div class="absolute bottom-10 right-0 w-[500px] h-[500px] bg-pink rounded-full filter blur-[130px] opacity-10"></div>
        <div class="absolute top-20 right-1/4 w-[300px] h-[300px] bg-sun rounded-full filter blur-[100px] opacity-15"></div>
    </div>

    <!-- Tekstur Dot Pattern Halus -->
    <div class="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-50 pointer-events-none"></div>

    <!-- === KONTEN UTAMA (GRID 2 KOLOM) === -->
    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            <!-- KOLOM KIRI: Teks & Tombol -->
            <div class="text-center lg:text-left mt-8 lg:mt-0 order-2 lg:order-1">
                
                <!-- Badge Lencana -->
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue/20 bg-blue/5 mb-6">
                    <span class="text-sm font-bold text-blue uppercase tracking-wider">Platform Kerjasama</span>
                </div>
                
                <!-- Nama Aplikasi (Siperjaka) -->
                <h1 class="text-5xl sm:text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue via-purple to-pink mb-2 tracking-tight">
                    Titiktemu.
                </h1>
                
                <!-- Kepanjangan Singkatan -->
                <h2 class="text-2xl sm:text-3xl font-extrabold text-dark mb-6 leading-tight">
                    Sistem Informasi Implementasi <br class="hidden xl:block" /> 
                    Perjanjian dan Kerja Sama
                </h2>
                
                <!-- Deskripsi Pendek -->
                <p class="text-lg text-gray-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    Kelola, pantau, dan evaluasi seluruh dokumen perjanjian dan kerja sama secara digital, terpusat, dan sangat aman dalam satu platform modern.
                </p>

                <!-- Tombol Aksi (Sisa 1 tombol) -->
                <div class="flex justify-center lg:justify-start">
                    <a href="/register" class="bg-blue text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-purple transition-all shadow-xl hover:shadow-blue/30 transform hover:-translate-y-1 text-center">
                        Daftar Sekarang
                    </a>
                </div>
            </div>

            <!-- KOLOM KANAN: Komponen Gambar -->
            <div class="relative mx-auto w-full max-w-md lg:max-w-full lg:pl-10 order-1 lg:order-2">
                
                <!-- Aksen Dekorasi di belakang gambar -->
                <div class="absolute inset-0 bg-gradient-to-tr from-sun/30 to-pink/20 rounded-[2.5rem] transform rotate-3 scale-105 transition-transform duration-500 hover:rotate-6"></div>
                
                <!-- Tag <img> Utama -->
                <img 
                    src="https://placehold.co/800x600/f8fafc/0B6FB8?text=Ilustrasi+Kerjasama+Tim" 
                    alt="Ilustrasi Siperjaka" 
                    class="relative z-10 w-full h-auto rounded-[2rem] shadow-2xl border-[6px] border-white object-cover transform transition-transform hover:-translate-y-2 duration-500" 
                />

            </div>

        </div>
    </div>
</section>