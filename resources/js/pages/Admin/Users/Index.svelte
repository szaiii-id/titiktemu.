<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import CredentialsModal from './CredentialsModal.svelte';
    import DeleteConfirmModal from './DeleteConfirmModal.svelte';
    import ResetPasswordConfirmModal from './ResetPasswordConfirmModal.svelte';
    import { inertia, router, page } from '@inertiajs/svelte';

    let {
        users,
        filters = { search: '', per_page: 15 },
    }: {
        users: {
            data: Array<{
                id: number;
                name: string;
                username: string | null;
                email: string;
                role: 'admin' | 'mitra';
                profile?: { nama_penyedia_usaha: string | null; logo: string | null } | null;
                created_at: string;
            }>;
            current_page: number;
            last_page: number;
            from: number;
            to: number;
            total: number;
            links: Array<{ url: string | null; label: string; active: boolean }>;
        };
        filters: { search: string; per_page: number };
    } = $props();

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

    let authUserId = $derived(page.props.auth?.user?.id);

    // Modal state
    let showCredentialsModal = $state(false);
    let credentials = $state<{
        role: string;
        name: string;
        email: string;
        username: string | null;
        password: string;
    } | null>(null);

    let showDeleteModal = $state(false);
    let userToDelete = $state<{ id: number; name: string } | null>(null);

    // 🆕 Reset password modal state
    let showResetModal = $state(false);
    let userToReset = $state<{ id: number; name: string; email: string } | null>(null);

    // ✅ FIX state_referenced_locally: init search via function
    function initializeSearch(): string {
        return filters.search ?? '';
    }

    // Search state
    let search = $state(initializeSearch());
    let searchTimeout: ReturnType<typeof setTimeout>;
    let searchFocused = $state(false);

    // Tab state
    let activeTab = $state<'all' | 'admin' | 'mitra'>('all');

    // Cek flash credentials saat mount
    $effect(() => {
        const flash = page.props.flash as any;
        if (flash?.credentials) {
            credentials = flash.credentials;
            showCredentialsModal = true;
        }
    });

    // Filter users berdasarkan tab
    let filteredUsers = $derived(
        activeTab === 'all'
            ? users.data
            : users.data.filter((u) => u.role === activeTab)
    );

    let countAll = $derived(users.data.length);
    let countAdmin = $derived(users.data.filter((u) => u.role === 'admin').length);
    let countMitra = $derived(users.data.filter((u) => u.role === 'mitra').length);

    function handleSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            router.get(
                '/admin/users',
                { search, per_page: filters.per_page },
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);
    }

    function clearSearch() {
        search = '';
        clearTimeout(searchTimeout);
        router.get(
            '/admin/users',
            { search: '', per_page: filters.per_page },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    }

    function changeTab(tab: 'all' | 'admin' | 'mitra') {
        activeTab = tab;
    }

    // Delete
    function confirmDelete(user: { id: number; name: string }) {
        userToDelete = user;
        showDeleteModal = true;
    }

    function deleteUser() {
        if (!userToDelete) return;
        router.delete(`/admin/users/${userToDelete.id}`, {
            onFinish: () => {
                showDeleteModal = false;
                userToDelete = null;
            },
        });
    }

    // 🆕 Reset Password
    function confirmResetPassword(user: { id: number; name: string; email: string }) {
        userToReset = user;
        showResetModal = true;
    }

    function resetPassword() {
        if (!userToReset) return;
        router.post(`/admin/users/${userToReset.id}/reset-password`, {}, {
            preserveScroll: true,
            onFinish: () => {
                showResetModal = false;
                userToReset = null;
            },
        });
    }

    function roleBadgeClass(role: string) {
        return role === 'admin'
            ? 'bg-purple/10 text-purple border border-purple/20'
            : 'bg-blue/10 text-blue border border-blue/20';
    }

    function roleLabel(role: string) {
        return role === 'admin' ? 'Admin' : 'Mitra';
    }
</script>

<svelte:head>
    <title>Manajemen User | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Manajemen User" {menuItems}>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
            <h1 class="text-2xl font-extrabold text-dark">Manajemen User</h1>
            <p class="text-sm text-gray-500 mt-1">Kelola akun admin dan mitra</p>
        </div>
        <a
            href="/admin/users/create"
            use:inertia
            class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 self-start sm:self-auto"
        >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah User
        </a>
    </div>

    <!-- NOTE: Flash Status sekarang dirender oleh DashboardLayout (global) -->

    <!-- Card -->
    <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <!-- Toolbar -->
        <div class="p-4 sm:p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center gap-4">
            <!-- Filter Tabs -->
            <div class="inline-flex items-center bg-gray-100 rounded-2xl p-1.5 self-start">
                <button
                    type="button"
                    onclick={() => changeTab('all')}
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 {activeTab === 'all' ? 'bg-white text-dark shadow-sm' : 'text-gray-600 hover:text-dark'}"
                >
                    Semua
                    <span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-extrabold {activeTab === 'all' ? 'bg-pink-dark text-white' : 'bg-white text-gray-500'}">
                        {countAll}
                    </span>
                </button>
                <button
                    type="button"
                    onclick={() => changeTab('admin')}
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 {activeTab === 'admin' ? 'bg-white text-dark shadow-sm' : 'text-gray-600 hover:text-dark'}"
                >
                    Admin
                    <span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-extrabold {activeTab === 'admin' ? 'bg-purple text-white' : 'bg-white text-gray-500'}">
                        {countAdmin}
                    </span>
                </button>
                <button
                    type="button"
                    onclick={() => changeTab('mitra')}
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 {activeTab === 'mitra' ? 'bg-white text-dark shadow-sm' : 'text-gray-600 hover:text-dark'}"
                >
                    Mitra
                    <span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-extrabold {activeTab === 'mitra' ? 'bg-blue text-white' : 'bg-white text-gray-500'}">
                        {countMitra}
                    </span>
                </button>
            </div>

            <!-- Search -->
            <div class="flex-1 lg:max-w-md lg:ml-auto">
                <div class="relative">
                    <div class="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors {searchFocused ? 'text-pink-dark' : 'text-gray-400'}">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        bind:value={search}
                        oninput={handleSearch}
                        onfocus={() => (searchFocused = true)}
                        onblur={() => (searchFocused = false)}
                        placeholder="Cari nama, email, atau username..."
                        class="w-full pl-11 pr-10 py-3 border rounded-2xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                            {searchFocused
                                ? 'border-pink bg-white ring-4 ring-pink/10 shadow-sm'
                                : 'border-gray-200 hover:border-gray-300'}"
                    />
                    {#if search}
                        <button
                            type="button"
                            onclick={clearSearch}
                            class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 hover:bg-pink-dark hover:text-white text-gray-500 flex items-center justify-center transition-all"
                            aria-label="Hapus pencarian"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Table -->
        {#if filteredUsers.length === 0}
            <div class="p-16 text-center">
                <div class="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center mb-5 shadow-sm">
                    <svg class="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </div>
                <h3 class="text-lg font-extrabold text-dark mb-1">
                    {search ? 'Tidak ada hasil ditemukan' : 'Belum ada user'}
                </h3>
                <p class="text-sm text-gray-500 max-w-xs mx-auto">
                    {search
                        ? `Tidak ditemukan user dengan kata kunci "${search}". Coba kata kunci lain.`
                        : 'Mulai dengan menambahkan user admin atau mitra pertama Anda.'}
                </p>
                {#if search}
                    <button
                        type="button"
                        onclick={clearSearch}
                        class="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md"
                    >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Hapus Pencarian
                    </button>
                {/if}
            </div>
        {:else}
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-gray-50/80 border-b border-gray-200">
                        <tr>
                            <th class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest">User</th>
                            <th class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest">Role</th>
                            <th class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest hidden md:table-cell">Usaha</th>
                            <th class="text-right px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        {#each filteredUsers as user (user.id)}
                            <tr class="group hover:bg-gray-50/70 transition-colors">
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-3">
                                        <div class="relative flex-shrink-0">
                                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-pink-dark to-purple text-white flex items-center justify-center font-bold text-sm shadow-md">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
                                                <div class="w-2.5 h-2.5 rounded-full bg-green"></div>
                                            </div>
                                        </div>
                                        <div class="min-w-0">
                                            <p class="font-bold text-dark truncate">{user.name}</p>
                                            <p class="text-xs text-gray-500 truncate">{user.email}</p>
                                            {#if user.username}
                                                <p class="text-[11px] text-gray-500 truncate">@{user.username}</p>
                                            {/if}
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold {roleBadgeClass(user.role)}">
                                        {#if user.role === 'admin'}
                                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                        {:else}
                                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        {/if}
                                        {roleLabel(user.role)}
                                    </span>
                                </td>
                                <td class="px-6 py-4 hidden md:table-cell">
                                    {#if user.profile?.nama_penyedia_usaha}
                                        <p class="text-sm font-medium text-dark truncate">{user.profile.nama_penyedia_usaha}</p>
                                    {:else}
                                        <p class="text-sm text-gray-400 italic">-</p>
                                    {/if}
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex items-center justify-end gap-2 flex-wrap">
                                        <!-- Edit -->
                                        <a
                                            href={`/admin/users/${user.id}/edit`}
                                            use:inertia
                                            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue bg-blue/5 hover:bg-blue/10 hover:text-blue transition-all"
                                            aria-label="Edit user"
                                        >
                                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Edit
                                        </a>

                                        <!-- Reset Password -->
                                        <button
                                            type="button"
                                            onclick={() => confirmResetPassword({ id: user.id, name: user.name, email: user.email })}
                                            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-all"
                                            aria-label="Reset password"
                                        >
                                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                            </svg>
                                            Reset
                                        </button>

                                        <!-- Hapus (hanya jika BUKAN diri sendiri) -->
                                        {#if user.id !== authUserId}
                                            <button
                                                type="button"
                                                onclick={() => confirmDelete({ id: user.id, name: user.name })}
                                                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 transition-all"
                                                aria-label="Hapus user"
                                            >
                                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Hapus
                                            </button>
                                        {/if}
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            {#if users.last_page > 1}
                <div class="p-4 sm:p-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p class="text-xs text-gray-500">
                        Menampilkan <span class="font-extrabold text-dark">{users.from}</span>–<span class="font-extrabold text-dark">{users.to}</span> dari <span class="font-extrabold text-dark">{users.total}</span> user
                    </p>
                    <div class="flex items-center gap-1">
                        {#each users.links as link}
                            {#if link.url === null}
                                <span class="px-3.5 py-2.5 text-xs text-gray-300 font-bold">{@html link.label}</span>
                            {:else}
                                <a
                                    href={link.url}
                                    use:inertia
                                    class="min-w-[36px] text-center px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all {link.active ? 'bg-pink-dark text-white shadow-md shadow-pink/30' : 'text-gray-600 hover:bg-gray-100'}"
                                >
                                    {@html link.label}
                                </a>
                            {/if}
                        {/each}
                    </div>
                </div>
            {/if}
        {/if}
    </div>
</DashboardLayout>

<!-- Modal Kredensial -->
<CredentialsModal
    bind:open={showCredentialsModal}
    {credentials}
/>

<!-- Modal Konfirmasi Hapus -->
<DeleteConfirmModal
    bind:open={showDeleteModal}
    userName={userToDelete?.name ?? ''}
    onConfirm={deleteUser}
/>

<!-- 🆕 Modal Konfirmasi Reset Password -->
<ResetPasswordConfirmModal
    bind:open={showResetModal}
    userName={userToReset?.name ?? ''}
    userEmail={userToReset?.email ?? ''}
    onConfirm={resetPassword}
/>