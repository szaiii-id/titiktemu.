<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import { page } from '@inertiajs/svelte';

    const menuItems = [
        {
            label: 'Dashboard',
            href: '/client/dashboard',
            icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
        },
        {
            label: 'Profile Saya',
            href: '/client/profile',
            icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
        },
    ];

    let user = $derived(page.props.auth?.user);
</script>

<svelte:head>
    <title>Dashboard Client | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Dashboard" {menuItems}>
    <!-- Welcome Card -->
    <div class="bg-gradient-to-r from-green-dark to-blue rounded-3xl p-8 text-white shadow-lg mb-6">
        <h1 class="text-3xl sm:text-4xl font-extrabold mb-2">
            Selamat Datang, {user?.name ?? 'Client'}<span class="text-sun">.</span>
        </h1>
        <p class="text-sm sm:text-base opacity-90">
            Jelajahi trip dan bundle perjalanan yang tersedia.
        </p>
    </div>

    <!-- Info -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 class="text-lg font-bold text-dark mb-2">Panel Client</h2>
        <p class="text-sm text-gray-600 leading-relaxed">
            Fitur pencarian trip & bundle akan segera tersedia.
        </p>
    </div>
</DashboardLayout>