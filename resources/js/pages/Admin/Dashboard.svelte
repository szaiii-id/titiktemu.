<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import { page } from '@inertiajs/svelte';

    const menuItems = [
        {
            label: 'Dashboard',
            href: '/admin/dashboard',
            icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
        },
        {
            label: 'Manajemen User',
            href: '/admin/users',
            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
        },
        {
            label: 'Daftar Client',
            href: '/admin/clients',
            icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
        },
    ];

    let user = $derived(page.props.auth?.user);
</script>

<svelte:head>
    <title>Dashboard Admin | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Dashboard" {menuItems}>
    <!-- Welcome Card -->
    <div class="bg-gradient-to-r from-pink-dark to-purple rounded-3xl p-8 text-white shadow-lg mb-6">
        <h1 class="text-3xl sm:text-4xl font-extrabold mb-2">
            Selamat Datang, {user?.name ?? 'Admin'}<span class="text-sun">.</span>
        </h1>
        <p class="text-sm sm:text-base opacity-90">
            Kelola platform Titiktemu dari sini. Anda memiliki akses penuh untuk mengelola user, mitra, dan client.
        </p>
    </div>

    <!-- Statistik Placeholder -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-gray-500">Total Admin</span>
                <div class="w-8 h-8 rounded-full bg-purple/10 text-purple flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </div>
            </div>
            <p class="text-3xl font-extrabold text-dark">-</p>
            <p class="text-xs text-gray-500 mt-1">Segera hadir</p>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-gray-500">Total Mitra</span>
                <div class="w-8 h-8 rounded-full bg-pink/10 text-pink flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
            </div>
            <p class="text-3xl font-extrabold text-dark">-</p>
            <p class="text-xs text-gray-500 mt-1">Segera hadir</p>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-gray-500">Total Client</span>
                <div class="w-8 h-8 rounded-full bg-blue/10 text-blue flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
            </div>
            <p class="text-3xl font-extrabold text-dark">-</p>
            <p class="text-xs text-gray-500 mt-1">Segera hadir</p>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-gray-500">Total Trip</span>
                <div class="w-8 h-8 rounded-full bg-green/10 text-green-dark flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </div>
            <p class="text-3xl font-extrabold text-dark">-</p>
            <p class="text-xs text-gray-500 mt-1">Segera hadir</p>
        </div>
    </div>

    <!-- Panel Info -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 class="text-lg font-bold text-dark mb-2">Panel Kontrol Sistem</h2>
        <p class="text-sm text-gray-600 leading-relaxed">
            Gunakan menu di sidebar untuk mengelola user (admin & mitra) dan melihat daftar client.
            Fitur tambahan akan tersedia di versi berikutnya.
        </p>
    </div>
</DashboardLayout>