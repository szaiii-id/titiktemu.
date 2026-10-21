<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import CredentialsModal from './CredentialsModal.svelte';
    import ResetPasswordConfirmModal from './ResetPasswordConfirmModal.svelte';
    import ConfirmModal from '@/global/ConfirmModal.svelte';
    import EmptyState from '@/global/EmptyState.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import Pagination from '@/global/Pagination.svelte';
    import SearchInput from '@/global/SearchInput.svelte';
    import StatusTabs from '@/global/StatusTabs.svelte';
    import { inertia, router, page } from '@inertiajs/svelte';
    import type {
        Credentials,
        PaginationMeta,
        StatusTab,
        User,
    } from '@/types';
    import { adminMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type UserItem = Pick<
        User,
        'id' | 'name' | 'username' | 'email' | 'role' | 'created_at'
    > & {
        profile?: {
            nama_penyedia_usaha: string | null;
            logo: string | null;
        } | null;
    };

    let {
        users,
        filters = { search: '', per_page: 15 },
    }: {
        users: PaginationMeta & {
            data: Array<UserItem & { role: 'admin' | 'mitra' }>;
        };
        filters: { search: string; per_page: number };
    } = $props();

    // ==========================================
    // STATE
    // ==========================================

    let authUserId = $derived(page.props.auth?.user?.id);

    // Modal state
    let showCredentialsModal = $state(false);
    let credentials = $state<Credentials | null>(null);

    let showDeleteModal = $state(false);
    let userToDelete = $state<{ id: number; name: string } | null>(null);
    let deleteProcessing = $state(false);

    let showResetModal = $state(false);
    let userToReset = $state<{
        id: number;
        name: string;
        email: string;
    } | null>(null);

    // Search state — di-init dari props `filters` (initial value).
    // Setelah user ketik → router.get() → Inertia reload → komponen
    // re-mount → state re-init dari filters baru. Jadi tidak perlu sync.
    // svelte-ignore state_referenced_locally
    let search = $state(filters.search ?? '');
    let searchTimeout: ReturnType<typeof setTimeout>;

    // Tab state
    let activeTab = $state<'all' | 'admin' | 'mitra'>('all');

    // ==========================================
    // EFFECTS & DERIVED
    // ==========================================

    // Cek flash credentials saat mount
    $effect(() => {
        const flash = page.props.flash as {
            credentials?: Credentials | null;
        };
        if (flash?.credentials) {
            credentials = flash.credentials;
            showCredentialsModal = true;
        }
    });

    // Filter users berdasarkan tab
    let filteredUsers = $derived(
        activeTab === 'all'
            ? users.data
            : users.data.filter((u) => u.role === activeTab),
    );

    let countAll = $derived(users.data.length);
    let countAdmin = $derived(
        users.data.filter((u) => u.role === 'admin').length,
    );
    let countMitra = $derived(
        users.data.filter((u) => u.role === 'mitra').length,
    );

    let hasActiveFilters = $derived(search !== '');

    // ==========================================
    // STATUS TABS
    // ==========================================

    let statusTabs: StatusTab[] = $derived([
        { value: 'all', label: 'Semua', count: countAll },
        { value: 'admin', label: 'Admin', count: countAdmin },
        { value: 'mitra', label: 'Mitra', count: countMitra },
    ]);

    // ==========================================
    // HANDLERS
    // ==========================================

    function handleSearch(value: string) {
        search = value;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            router.get(
                '/admin/users',
                { search, per_page: filters.per_page },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 300);
    }

    function clearSearch() {
        search = '';
        clearTimeout(searchTimeout);
        router.get(
            '/admin/users',
            { search: '', per_page: filters.per_page },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    function changeTab(value: string) {
        activeTab = value as 'all' | 'admin' | 'mitra';
    }

    // Delete
    function confirmDelete(user: { id: number; name: string }) {
        userToDelete = user;
        showDeleteModal = true;
    }

    function deleteUser() {
        if (!userToDelete) return;
        deleteProcessing = true;
        router.delete(`/admin/users/${userToDelete.id}`, {
            onFinish: () => {
                deleteProcessing = false;
                showDeleteModal = false;
                userToDelete = null;
            },
        });
    }

    // Reset Password
    function confirmResetPassword(user: {
        id: number;
        name: string;
        email: string;
    }) {
        userToReset = user;
        showResetModal = true;
    }

    function resetPassword() {
        if (!userToReset) return;
        router.post(
            `/admin/users/${userToReset.id}/reset-password`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    showResetModal = false;
                    userToReset = null;
                },
            },
        );
    }

    function roleBadgeClass(role: string): string {
        return role === 'admin'
            ? 'bg-purple/10 text-purple border border-purple/20'
            : 'bg-blue/10 text-blue border border-blue/20';
    }

    function roleLabel(role: string): string {
        return role === 'admin' ? 'Admin' : 'Mitra';
    }
</script>

<svelte:head>
    <title>Manajemen User | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Manajemen User" menuItems={adminMenu}>
    <PageHeader
        title="Manajemen User"
        description="Kelola akun admin dan mitra"
    >
        {#snippet actions()}
            <a
                href="/admin/users/create"
                use:inertia
                class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
                <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                    aria-hidden="true"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 4v16m8-8H4"
                    />
                </svg>
                Tambah User
            </a>
        {/snippet}
    </PageHeader>

    <!-- Card -->
    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
    >
        <!-- Toolbar -->
        <div
            class="p-4 sm:p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center gap-4"
        >
            <!-- Filter Tabs -->
            <div class="self-start">
                <StatusTabs
                    tabs={statusTabs}
                    bind:active={activeTab}
                    onchange={changeTab}
                />
            </div>

            <!-- Search -->
            <div class="flex-1 lg:max-w-md lg:ml-auto">
                <SearchInput
                    bind:value={search}
                    oninput={handleSearch}
                    onclear={clearSearch}
                    placeholder="Cari nama, email, atau username..."
                />
            </div>
        </div>

        <!-- Table / Empty -->
        {#if filteredUsers.length === 0}
            <EmptyState
                icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                title={hasActiveFilters
                    ? 'Tidak ada hasil ditemukan'
                    : 'Belum ada user'}
                description={hasActiveFilters
                    ? `Tidak ditemukan user dengan kata kunci "${search}". Coba kata kunci lain.`
                    : 'Mulai dengan menambahkan user admin atau mitra pertama Anda.'}
                hasFilters={hasActiveFilters}
                onClear={clearSearch}
            />
        {:else}
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead
                        class="bg-gray-50/80 border-b border-gray-200"
                    >
                        <tr>
                            <th
                                class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest"
                            >
                                User
                            </th>
                            <th
                                class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest"
                            >
                                Role
                            </th>
                            <th
                                class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest hidden md:table-cell"
                            >
                                Usaha
                            </th>
                            <th
                                class="text-right px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest"
                            >
                                Aksi
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        {#each filteredUsers as user (user.id)}
                            <tr
                                class="group hover:bg-gray-50/70 transition-colors"
                            >
                                <td class="px-6 py-4">
                                    <div
                                        class="flex items-center gap-3"
                                    >
                                        <div
                                            class="relative shrink-0"
                                        >
                                            <div
                                                class="w-10 h-10 rounded-full bg-linear-to-br from-pink-dark to-purple text-white flex items-center justify-center font-bold text-sm shadow-md"
                                            >
                                                {user.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>
                                            <div
                                                class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center"
                                            >
                                                <div
                                                    class="w-2.5 h-2.5 rounded-full bg-green"
                                                ></div>
                                            </div>
                                        </div>
                                        <div class="min-w-0">
                                            <p
                                                class="font-bold text-dark truncate"
                                            >
                                                {user.name}
                                            </p>
                                            <p
                                                class="text-xs text-gray-500 truncate"
                                            >
                                                {user.email}
                                            </p>
                                            {#if user.username}
                                                <p
                                                    class="text-[11px] text-gray-500 truncate"
                                                >
                                                    @{user.username}
                                                </p>
                                            {/if}
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <span
                                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold {roleBadgeClass(
                                            user.role,
                                        )}"
                                    >
                                        {#if user.role === 'admin'}
                                            <svg
                                                class="w-3 h-3"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                stroke-width="2.5"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                                />
                                            </svg>
                                        {:else}
                                            <svg
                                                class="w-3 h-3"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                stroke-width="2.5"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                                />
                                            </svg>
                                        {/if}
                                        {roleLabel(user.role)}
                                    </span>
                                </td>
                                <td
                                    class="px-6 py-4 hidden md:table-cell"
                                >
                                    {#if user.profile?.nama_penyedia_usaha}
                                        <p
                                            class="text-sm font-medium text-dark truncate"
                                        >
                                            {user.profile
                                                .nama_penyedia_usaha}
                                        </p>
                                    {:else}
                                        <p
                                            class="text-sm text-gray-400 italic"
                                        >
                                            -
                                        </p>
                                    {/if}
                                </td>
                                <td class="px-6 py-4">
                                    <div
                                        class="flex items-center justify-end gap-2 flex-wrap"
                                    >
                                        <!-- Edit -->
                                        <a
                                            href={`/admin/users/${user.id}/edit`}
                                            use:inertia
                                            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue bg-blue/5 hover:bg-blue/10 hover:text-blue transition-all"
                                            aria-label="Edit user"
                                        >
                                            <svg
                                                class="w-3.5 h-3.5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                stroke-width="2.5"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                />
                                            </svg>
                                            Edit
                                        </a>

                                        <!-- Reset Password -->
                                        <button
                                            type="button"
                                            onclick={() =>
                                                confirmResetPassword({
                                                    id: user.id,
                                                    name: user.name,
                                                    email: user.email,
                                                })}
                                            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-all"
                                            aria-label="Reset password"
                                        >
                                            <svg
                                                class="w-3.5 h-3.5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                stroke-width="2.5"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                                                />
                                            </svg>
                                            Reset
                                        </button>

                                        <!-- Hapus (hanya jika BUKAN diri sendiri) -->
                                        {#if user.id !== authUserId}
                                            <button
                                                type="button"
                                                onclick={() =>
                                                    confirmDelete({
                                                        id: user.id,
                                                        name: user.name,
                                                    })}
                                                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 transition-all"
                                                aria-label="Hapus user"
                                            >
                                                <svg
                                                    class="w-3.5 h-3.5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    stroke-width="2.5"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                    />
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
            <Pagination meta={users} label="user" />
        {/if}
    </div>
</DashboardLayout>

<!-- Modal Kredensial -->
<CredentialsModal
    bind:open={showCredentialsModal}
    {credentials}
/>

<!-- Modal Konfirmasi Hapus -->
<ConfirmModal
    bind:open={showDeleteModal}
    variant="danger"
    title="Hapus User?"
    description={`Yakin ingin menghapus "${userToDelete?.name ?? ''}"? Tindakan ini tidak bisa dibatalkan.`}
    confirmLabel="Ya, Hapus"
    processing={deleteProcessing}
    onConfirm={deleteUser}
/>

<!-- Modal Konfirmasi Reset Password -->
<ResetPasswordConfirmModal
    bind:open={showResetModal}
    userName={userToReset?.name ?? ''}
    userEmail={userToReset?.email ?? ''}
    onConfirm={resetPassword}
/>