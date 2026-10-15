<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import { inertia, router, page } from '@inertiajs/svelte';

    let {
        clients,
        filters = { search: '', per_page: 15 },
    }: {
        clients: {
            data: Array<{
                id: number;
                name: string;
                username: string | null;
                email: string;
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

    // ✅ FIX state_referenced_locally: init via function
    function initializeSearch(): string {
        return filters.search ?? '';
    }

    let search = $state(initializeSearch());
    let searchTimeout: ReturnType<typeof setTimeout>;
    let searchFocused = $state(false);

    function handleSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            router.get('/admin/clients', { search, per_page: filters.per_page }, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 300);
    }

    function clearSearch() {
        search = '';
        clearTimeout(searchTimeout);
        router.get('/admin/clients', { search: '', per_page: filters.per_page }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }
</script>

<svelte:head>
    <title>Daftar Client | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Daftar Client" {menuItems}>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
            <h1 class="text-2xl font-extrabold text-dark">Daftar Client</h1>
            <p class="text-sm text-gray-500 mt-1">
                Client yang mendaftar mandiri. Read-only — tidak bisa diedit atau dihapus.
            </p>
        </div>

        <!-- Info Badge (kanan) -->
        <div class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue/5 border border-blue/20 self-start sm:self-auto">
            <div class="w-6 h-6 rounded-full bg-blue/15 text-blue flex items-center justify-center flex-shrink-0">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            </div>
            <span class="text-sm font-extrabold text-blue">{clients.total}</span>
            <span class="text-xs font-bold text-gray-600">Client Terdaftar</span>
        </div>
    </div>

    <!-- Card -->
    <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

        <!-- ==========================================
             TOOLBAR
        ========================================== -->
        <div class="p-4 sm:p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center gap-4">

            <!-- Info View Mode -->
            <div class="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-50 rounded-xl border border-gray-100">
                <div class="w-1.5 h-1.5 rounded-full bg-green animate-pulse"></div>
                <span class="text-xs font-bold text-gray-600">Mode Read-only</span>
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

        <!-- ==========================================
             TABLE
        ========================================== -->
        {#if clients.data.length === 0}
            <!-- Empty State -->
            <div class="p-16 text-center">
                <div class="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center mb-5 shadow-sm">
                    <svg class="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <h3 class="text-lg font-extrabold text-dark mb-1">
                    {search ? 'Tidak ada hasil ditemukan' : 'Belum ada client'}
                </h3>
                <p class="text-sm text-gray-500 max-w-xs mx-auto">
                    {search
                        ? `Tidak ditemukan client dengan kata kunci "${search}". Coba kata kunci lain.`
                        : 'Client yang mendaftar mandiri akan muncul di sini.'}
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
                            <th class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest">Client</th>
                            <th class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest hidden md:table-cell">Username</th>
                            <th class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest hidden sm:table-cell">Terdaftar</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        {#each clients.data as client (client.id)}
                            <tr class="hover:bg-gray-50/70 transition-colors">
                                <!-- Client -->
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-3">
                                        <div class="relative flex-shrink-0">
                                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue to-purple text-white flex items-center justify-center font-bold text-sm shadow-md">
                                                {client.name.charAt(0).toUpperCase()}
                                            </div>
                                            <!-- Online dot -->
                                            <div class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
                                                <div class="w-2.5 h-2.5 rounded-full bg-green"></div>
                                            </div>
                                        </div>
                                        <div class="min-w-0">
                                            <p class="font-bold text-dark truncate">{client.name}</p>
                                            <p class="text-xs text-gray-500 truncate">{client.email}</p>
                                        </div>
                                    </div>
                                </td>

                                <!-- Username -->
                                <td class="px-6 py-4 hidden md:table-cell">
                                    {#if client.username}
                                        <span class="inline-flex items-center gap-1 text-sm font-medium text-gray-600">
                                            <span class="text-gray-400">@</span>{client.username}
                                        </span>
                                    {:else}
                                        <span class="text-sm text-gray-400 italic">-</span>
                                    {/if}
                                </td>

                                <!-- Terdaftar -->
                                <td class="px-6 py-4 hidden sm:table-cell">
                                    <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span class="text-xs font-bold">{formatDate(client.created_at)}</span>
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            {#if clients.last_page > 1}
                <div class="p-4 sm:p-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p class="text-xs text-gray-500">
                        Menampilkan <span class="font-extrabold text-dark">{clients.from}</span>–<span class="font-extrabold text-dark">{clients.to}</span> dari <span class="font-extrabold text-dark">{clients.total}</span> client
                    </p>
                    <div class="flex items-center gap-1">
                        {#each clients.links as link}
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