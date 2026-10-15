<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import { page } from '@inertiajs/svelte';

    const menuItems = [
        {
            label: 'Dashboard',
            href: '/mitra/dashboard',
            icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
        },
        {
            label: 'Profile Usaha',
            href: '/mitra/profile',
            icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
        },
        {
            label: 'Ganti Password',
            href: '/mitra/password',
            icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
        },
    ];

    let user = $derived(page.props.auth?.user);
</script>

<svelte:head>
    <title>Dashboard Mitra | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Dashboard" {menuItems}>
    <div class="bg-gradient-to-r from-blue-dark to-purple rounded-3xl p-8 text-white shadow-lg mb-6">
        <h1 class="text-3xl sm:text-4xl font-extrabold mb-2">
            Selamat Datang, {user?.name ?? 'Mitra'}<span class="text-sun">.</span>
        </h1>
        <p class="text-sm sm:text-base opacity-90">
            Kelola profile usaha dan informasi akun Anda dari sini.
        </p>
    </div>

    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 class="text-lg font-bold text-dark mb-2">Panel Mitra</h2>
        <p class="text-sm text-gray-600 leading-relaxed">
            Gunakan menu di sidebar untuk mengelola profile usaha dan mengganti password Anda.
        </p>
    </div>
</DashboardLayout>