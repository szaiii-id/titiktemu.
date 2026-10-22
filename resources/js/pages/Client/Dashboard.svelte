<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import { inertia, page } from '@inertiajs/svelte';
    import { clientMenu } from '@/utils/menus';

    let user = $derived(page.props.auth?.user);
</script>

<svelte:head>
    <title>Dashboard Client | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Dashboard" menuItems={clientMenu}>
    <!-- Welcome Card -->
    <div
        class="bg-gradient-to-r from-green-dark to-blue rounded-3xl p-8 text-white shadow-lg mb-6"
    >
        <h1 class="text-3xl sm:text-4xl font-extrabold mb-2">
            Selamat Datang, {user?.name ?? 'Client'}<span class="text-sun"
                >.</span
            >
        </h1>
        <p class="text-sm sm:text-base opacity-90">
            Jelajahi trip dan bundle perjalanan yang tersedia.
        </p>
    </div>

    <!-- Akses Cepat -->
    <div class="mb-6">
        <h2 class="text-lg font-extrabold text-dark mb-3">
            Akses Cepat
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Katalog -->
            <a
                href="/client/catalog"
                use:inertia
                data-testid="card-katalog"
                class="group bg-white rounded-3xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-pink/30 transition-all"
            >
                <div
                    class="w-11 h-11 rounded-2xl bg-pink/10 text-pink-text flex items-center justify-center mb-3 group-hover:bg-pink-dark group-hover:text-white transition-all"
                >
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                    </svg>
                </div>
                <h3 class="text-base font-extrabold text-dark mb-1">
                    Katalog Paket
                </h3>
                <p class="text-xs text-gray-500 leading-relaxed">
                    Temukan paket wisata menarik untuk liburan Anda.
                </p>
            </a>

            <!-- Booking Saya -->
            <a
                href="/client/bookings"
                use:inertia
                data-testid="card-booking"
                class="group bg-white rounded-3xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-blue/30 transition-all"
            >
                <div
                    class="w-11 h-11 rounded-2xl bg-blue/10 text-blue flex items-center justify-center mb-3 group-hover:bg-blue group-hover:text-white transition-all"
                >
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        />
                    </svg>
                </div>
                <h3 class="text-base font-extrabold text-dark mb-1">
                    Booking Saya
                </h3>
                <p class="text-xs text-gray-500 leading-relaxed">
                    Pantau status booking dan unduh e-ticket Anda.
                </p>
            </a>

            <!-- Profile -->
            <a
                href="/client/profile"
                use:inertia
                data-testid="card-profile"
                class="group bg-white rounded-3xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-purple/30 transition-all"
            >
                <div
                    class="w-11 h-11 rounded-2xl bg-purple/10 text-purple flex items-center justify-center mb-3 group-hover:bg-purple group-hover:text-white transition-all"
                >
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                    </svg>
                </div>
                <h3 class="text-base font-extrabold text-dark mb-1">
                    Profile Saya
                </h3>
                <p class="text-xs text-gray-500 leading-relaxed">
                    Kelola informasi akun dan data pribadi Anda.
                </p>
            </a>
        </div>
    </div>
</DashboardLayout>