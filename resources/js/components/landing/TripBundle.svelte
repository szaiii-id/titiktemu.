<script>
    const bundles = [
        {
            id: 1,
            title: "Paket Meratus Explorer",
            location: "Pegunungan Meratus",
            short: "Eksplorasi alam dengan fasilitas lengkap.",
            description:
                "Paket ini dirancang khusus untuk Anda yang menyukai petualangan. Dilengkapi dengan asuransi perjalanan, perlengkapan standar, dan pemandu bersertifikat.",
            image:
                "https://placehold.co/800x1000/50653A/ffffff?text=Meratus+Explorer"
        },
        {
            id: 2,
            title: "Wisata Bahari Bundle",
            location: "Pesisir & Kepulauan",
            short: "Relaksasi dan diskusi di pesisir pantai.",
            description:
                "Pilihan tepat untuk agenda gathering atau meeting santai. Bundle ini mencakup penyewaan ruang rapat tepi pantai dan akomodasi bintang 4.",
            image:
                "https://placehold.co/800x1000/357CA5/ffffff?text=Wisata+Bahari"
        },
        {
            id: 3,
            title: "Highland VIP Pass",
            location: "Dataran Tinggi Eksklusif",
            short: "Layanan premium di dataran tinggi.",
            description:
                "Fasilitas tingkat atas untuk mitra VIP Anda. Termasuk layanan antar-jemput eksklusif dan akses privat ke berbagai fasilitas pendukung.",
            image:
                "https://placehold.co/800x1000/755B78/ffffff?text=Highland+VIP"
        }
    ];


    // ==========================================
    // ACTIVE SLIDE
    // ==========================================

    let activeId = $state(1);

    let isHovering = $state(false);

    let autoplay;


    // ==========================================
    // ACTIVE PACKAGE
    // ==========================================

    let activeBundle = $derived(
        bundles.find((bundle) => bundle.id === activeId)
    );


    // ==========================================
    // MENGHITUNG POSISI SETIAP GAMBAR
    //
    // left   = kiri
    // center = tengah
    // right  = kanan
    // ==========================================

    function getPosition(bundleId) {
        const activeIndex = bundles.findIndex(
            (bundle) => bundle.id === activeId
        );

        const bundleIndex = bundles.findIndex(
            (bundle) => bundle.id === bundleId
        );

        let difference =
            bundleIndex - activeIndex;

        /*
         * Membuat posisi menjadi circular.
         */
        if (difference > 1) {
            difference -= bundles.length;
        }

        if (difference < -1) {
            difference += bundles.length;
        }

        if (difference === 0) {
            return "center";
        }

        if (difference === -1) {
            return "left";
        }

        return "right";
    }


    // ==========================================
    // PILIH GAMBAR
    // ==========================================

    function selectBundle(id) {
        activeId = id;
    }


    // ==========================================
    // GERAK KE KIRI
    // ==========================================

    function nextBundle() {
        const currentIndex = bundles.findIndex(
            (bundle) => bundle.id === activeId
        );

        const nextIndex =
            (currentIndex + 1) % bundles.length;

        activeId = bundles[nextIndex].id;
    }


    // ==========================================
    // GERAK KE KANAN
    //
    // INI YANG DIPAKAI AUTOPLAY
    //
    // Kartu kiri -> tengah
    // Tengah -> kanan
    // Kanan -> kiri
    // ==========================================

    function previousBundle() {
        const currentIndex = bundles.findIndex(
            (bundle) => bundle.id === activeId
        );

        const previousIndex =
            (currentIndex - 1 + bundles.length) %
            bundles.length;

        activeId = bundles[previousIndex].id;
    }


    // ==========================================
    // AUTOPLAY
    // ==========================================

    function startAutoplay() {
        clearInterval(autoplay);

        autoplay = setInterval(() => {

            if (!isHovering) {
                /*
                 * previousBundle dipakai supaya
                 * gambar bergerak dari KIRI -> TENGAH -> KANAN
                 */
                previousBundle();
            }

        }, 4000);
    }


    // ==========================================
    // START AUTOPLAY
    // ==========================================

    $effect(() => {

        startAutoplay();

        return () => {
            clearInterval(autoplay);
        };

    });
</script>


<!-- Ubah scroll-mt-32 menjadi scroll-mt-48 -->
<section id="trip" class="py-28 bg-white relative overflow-hidden scroll-mt-12">
    <div
        class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"
    >
        <!-- ==================================================
             MAIN LAYOUT
        =================================================== -->

        <div
            class="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10 xl:gap-16"
        >


            <!-- ==================================================
                 LEFT CONTENT
            =================================================== -->

            <div
                class="relative z-30 max-w-xl"
            >

                <!-- LABEL -->

                <div class="mb-5">
                    <span
                        class="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600 shadow-sm"
                    >

                        <span
                            class="h-1.5 w-1.5 rounded-full bg-blue-600"
                        ></span>

                        Our Packages

                    </span>
                </div>


                <!-- HEADING -->

                <h2
                    class="max-w-lg text-4xl font-extrabold leading-[1.05] tracking-[-0.04em] text-gray-900 sm:text-5xl lg:text-[3.5rem]"
                >

                    Not Your Boring

                    <br />

                    <span class="text-blue-600">
                        Travel Agent
                    </span>

                </h2>


                <!-- DESCRIPTION -->

                <p
                    class="mt-6 max-w-md text-sm leading-6 text-gray-500 sm:text-base"
                >
                    Kami plan, craft, execute trip with good vibes
                    and better people. Pilih paket perjalanan yang
                    paling cocok untuk pengalaman Anda.
                </p>


                <!-- ACTIVE PACKAGE -->

                <div
                    class="mt-7 flex max-w-md items-start gap-3"
                >

                    <!-- ICON -->

                    <div
                        class="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50"
                    >

                        <svg
                            class="h-4 w-4 text-blue-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >

                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />

                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />

                        </svg>

                    </div>


                    <!-- TEXT -->

                    <div>

                        <p
                            class="text-[9px] font-bold uppercase tracking-[0.16em] text-gray-600"
                        >
                            Featured Package
                        </p>

                        <p
                            class="mt-1 text-sm font-bold text-gray-900"
                        >
                            {activeBundle.location}
                        </p>

                        <p
                            class="mt-1 text-xs leading-5 text-gray-500"
                        >
                            {activeBundle.short}
                        </p>

                    </div>

                </div>


                <!-- BOOK BUTTON -->

                <div class="mt-7">

                    <button
                        type="button"
                        class="inline-flex items-center gap-3 rounded-full bg-gray-900 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-gray-900/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-blue-600/20"
                    >

                        Book a Seat

                        <svg
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >

                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />

                        </svg>

                    </button>

                </div>

            </div>


            <!-- ==================================================
                 RIGHT IMAGE CAROUSEL
            =================================================== -->

            <div
                class="relative z-10"
                role="region"
                aria-label="Galeri paket perjalanan"
                onmouseenter={() => {
                    isHovering = true;
                }}
                onmouseleave={() => {
                    isHovering = false;
                }}
            >

                <!-- IMAGE AREA -->

                <div
                    class="relative mx-auto h-[430px] w-full max-w-2xl sm:h-[500px]"
                >

                    {#each bundles as bundle (bundle.id)}

    <button
        type="button"
        aria-label={`Pilih ${bundle.title}`}
        onclick={() => selectBundle(bundle.id)}
        class={`absolute top-0 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]
            ${
                getPosition(bundle.id) === "left"
                    ? "left-0 top-[100px] z-10"
                    : getPosition(bundle.id) === "center"
                        ? "left-1/2 z-20 -translate-x-1/2"
                        : "right-0 top-[135px] z-10"
            }
        `}
    >

        <div
            class={`
                relative overflow-hidden border-4 border-white bg-gray-100
                transition-all duration-1000
                ease-[cubic-bezier(0.22,1,0.36,1)]
                ${
                    getPosition(bundle.id) === "center"
                        ? "h-[360px] w-56 rounded-[2rem] scale-100 opacity-100 shadow-2xl sm:h-[410px] sm:w-64 lg:h-[430px] lg:w-72"
                        : getPosition(bundle.id) === "left"
                            ? "h-60 w-36 rounded-[1.5rem] scale-90 opacity-70 shadow-xl sm:h-72 sm:w-44"
                            : "h-56 w-36 rounded-[1.5rem] scale-90 opacity-70 shadow-xl sm:h-64 sm:w-44"
                }
            `}
        >

            <img
                src={bundle.image}
                alt={bundle.title}
                class="h-full w-full object-cover transition-transform duration-1000 ease-out hover:scale-110"
            />

            <div
                class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
            ></div>

            <div
                class="absolute bottom-5 left-4 right-4 text-left sm:bottom-6 sm:left-5 sm:right-5"
            >

                <p
                    class="text-[8px] font-bold uppercase tracking-[0.16em] text-white/70 sm:text-[9px]"
                >
                    {bundle.location}
                </p>

                <h3
                    class="mt-1 text-sm font-extrabold leading-tight text-white sm:text-lg"
                >
                    {bundle.title}
                </h3>

            </div>

            {#if getPosition(bundle.id) === "center"}

                <div
                    class="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur"
                >
                    <span
                        class="h-2 w-2 animate-pulse rounded-full bg-blue-600"
                    ></span>
                </div>

            {/if}

        </div>

    </button>

{/each}


                    <!-- ==========================================
                         MOBILE THUMBNAILS
                    =========================================== -->

                    <div
                        class="absolute bottom-0 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 sm:hidden"
                    >

                        {#each bundles as bundle}

                            <button
                                type="button"
                                onclick={() =>
                                    selectBundle(bundle.id)
                                }
                                aria-label={`Pilih ${bundle.title}`}
                                class="
                                    overflow-hidden
                                    rounded-xl
                                    border-2
                                    transition-all
                                    duration-500
                                "
                                class:h-16={activeId === bundle.id}
                                class:w-12={activeId === bundle.id}
                                class:h-14={activeId !== bundle.id}
                                class:w-10={activeId !== bundle.id}
                                class:border-blue-600={activeId === bundle.id}
                                class:border-white={activeId !== bundle.id}
                                class:opacity-100={activeId === bundle.id}
                                class:opacity-60={activeId !== bundle.id}
                            >

                                <img
                                    src={bundle.image}
                                    alt={bundle.title}
                                    class="h-full w-full object-cover"
                                />

                            </button>

                        {/each}

                    </div>

                </div>

            </div>

        </div>


        <!-- ==================================================
             ACTIVE PACKAGE DETAIL
        =================================================== -->

        {#key activeId}

            <div
                class="mx-auto mt-12 max-w-3xl rounded-2xl border border-gray-100 bg-gray-50/70 px-5 py-5 text-center shadow-sm transition-all duration-700 lg:mt-8"
            >

                <p
                    class="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-600"
                >
                    {activeBundle.location}
                </p>

                <h3
                    class="mt-1 text-lg font-extrabold text-gray-900"
                >
                    {activeBundle.title}
                </h3>

                <p
                    class="mx-auto mt-2 max-w-xl text-xs leading-5 text-gray-500"
                >
                    {activeBundle.description}
                </p>

            </div>

        {/key}

    </div>
</section>