<script>
    // State sederhana untuk form interaktif
    let nama = $state("");
    let email = $state("");
    let pesan = $state("");
    let isSubmitted = $state(false);

    function handleSubmit(e) {
        e.preventDefault();
        // Simulasi pengiriman pesan
        isSubmitted = true;
        setTimeout(() => {
            isSubmitted = false;
            nama = "";
            email = "";
            pesan = "";
        }, 4000);
    }
</script>

<!-- ID "contact" agar tersambung dengan navigasi Navbar -->
<section id="contact" class="py-28 bg-gray-50/60 relative overflow-hidden border-t border-gray-100 scroll-mt-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <!-- Header Section -->
        <div class="text-center max-w-3xl mx-auto mb-20">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue/5 border border-blue/10 mb-4">
                <span class="text-xs font-extrabold text-blue uppercase tracking-wider">Hubungi Kami</span>
            </div>
            <h2 class="text-4xl sm:text-5xl font-extrabold text-dark tracking-tight mb-6">
                Punya Pertanyaan atau <span class="text-blue">Butuh Bantuan?</span>
            </h2>
            <p class="text-gray-600 text-lg leading-relaxed">
                Tim Siperjaka siap membantu instansi atau mitra Anda dalam mengoptimalkan pengelolaan data kerja sama.
            </p>
        </div>

        <!-- Grid Layout: Kiri (Info Kontak), Kanan (Formulir) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            <!-- KOLOM KIRI: Informasi Kontak (Lebar 5) -->
            <div class="lg:col-span-5 bg-dark text-white rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col justify-between space-y-12">
                <!-- Efek cahaya pendar -->
                <div class="absolute -top-20 -right-20 w-60 h-60 bg-blue/20 rounded-full filter blur-[70px] pointer-events-none"></div>
                <div class="absolute -bottom-20 -left-20 w-60 h-60 bg-pink/20 rounded-full filter blur-[70px] pointer-events-none"></div>

                <div>
                    <h3 class="text-2xl font-extrabold text-white mb-4">Informasi Kontak</h3>
                    <p class="text-gray-400 text-sm leading-relaxed mb-8">
                        Silakan hubungi kami melalui saluran resmi di bawah ini atau kirimkan pesan langsung melalui formulir.
                    </p>

                    <!-- Daftar Info -->
                    <div class="space-y-6">
                        <!-- Lokasi -->
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 text-sun">
                                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1115 0z" />
                                </svg>
                            </div>
                            <div>
                                <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Lokasi</p>
                                <p class="text-white font-medium text-sm sm:text-base mt-0.5">Banjarbaru, Kalimantan Selatan, Indonesia</p>
                            </div>
                        </div>

                        <!-- Email -->
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 text-pink">
                                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                            </div>
                            <div>
                                <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Resmi</p>
                                <p class="text-white font-medium text-sm sm:text-base mt-0.5">hello@siperjaka.com</p>
                            </div>
                        </div>

                        <!-- Telepon -->
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 text-green">
                                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                </svg>
                            </div>
                            <div>
                                <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Telepon / WhatsApp</p>
                                <p class="text-white font-medium text-sm sm:text-base mt-0.5">+62 811 2233 4455</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pt-6 border-t border-gray-800 text-xs text-gray-400">
                    <p>&copy; 2026 Siperjaka. Sistem Informasi Kerja Sama.</p>
                </div>
            </div>

            <!-- KOLOM KANAN: Formulir Pesan (Lebar 7) -->
            <div class="lg:col-span-7 bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border border-gray-100">
                
                {#if isSubmitted}
                    <!-- Notifikasi Sukses Berkilau -->
                    <div class="bg-green/10 border border-green/30 text-green rounded-2xl p-6 text-center space-y-2 animate-in fade-in duration-300">
                        <h4 class="text-xl font-bold">Pesan Berhasil Terkirim!</h4>
                        <p class="text-sm text-gray-600">Terima kasih telah menghubungi kami. Tim kami akan segera merespons pesan Anda.</p>
                    </div>
                {:else}
                    <form on:submit={handleSubmit} class="space-y-6">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <!-- Nama -->
                            <div>
                                <label for="nama" class="block text-sm font-bold text-dark mb-2">Nama Lengkap</label>
                                <input 
                                    type="text" 
                                    id="nama" 
                                    bind:value={nama} 
                                    required
                                    placeholder="Masukkan nama Anda" 
                                    class="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 focus:border-blue focus:bg-white focus:outline-none transition-all text-sm font-medium"
                                />
                            </div>

                            <!-- Email -->
                            <div>
                                <label for="email" class="block text-sm font-bold text-dark mb-2">Alamat Email</label>
                                <input 
                                    type="email" 
                                    id="email" 
                                    bind:value={email} 
                                    required
                                    placeholder="nama@instansi.com" 
                                    class="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 focus:border-blue focus:bg-white focus:outline-none transition-all text-sm font-medium"
                                />
                            </div>
                        </div>

                        <!-- Pesan -->
                        <div>
                            <label for="pesan" class="block text-sm font-bold text-dark mb-2">Pesan atau Keterangan</label>
                            <textarea 
                                id="pesan" 
                                bind:value={pesan} 
                                required
                                rows="5" 
                                placeholder="Tuliskan pesan, pertanyaan, atau permohonan informasi kerja sama di sini..." 
                                class="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 focus:border-blue focus:bg-white focus:outline-none transition-all text-sm font-medium resize-none"
                            ></textarea>
                        </div>

                        <!-- Tombol Kirim -->
                        <button type="submit" class="w-full bg-blue text-white py-4 rounded-full font-bold text-base hover:bg-purple transition-all shadow-lg hover:shadow-blue/30 transform hover:-translate-y-0.5">
                            Kirim Pesan Sekarang
                        </button>
                    </form>
                {/if}

            </div>

        </div>

    </div>
</section>