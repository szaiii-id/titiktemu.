<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import EmptyState from '@/global/EmptyState.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import Pagination from '@/global/Pagination.svelte';
    import SearchInput from '@/global/SearchInput.svelte';
    import { inertia, router } from '@inertiajs/svelte';
    import type { PaginationMeta, User } from '@/types';
    import { formatDate } from '@/utils/formatDate';
    import { adminMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        clients,
        filters = { search: '', per_page: 15 },
    }: {
        clients: PaginationMeta & {
            data: Array<
                Pick<
                    User,
                    'id' | 'name' | 'username' | 'email' | 'created_at'
                >
            >;
        };
        filters: { search: string; per_page: number };
    } = $props();

    // ==========================================
    // STATE
    // ==========================================

    // Search state — di-init dari props `filters` (initial value).
    // Setelah user ketik → router.get() → Inertia reload → komponen
    // re-mount → state re-init dari filters baru. Jadi tidak perlu sync.
    // svelte-ignore state_referenced_locally
    let search = $state(filters.search ?? '');
    let searchTimeout: ReturnType<typeof setTimeout>;

    // ==========================================
    // HANDLERS
    // ==========================================

    function handleSearch(value: string) {
        search = value;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            router.get(
                '/admin/clients',
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
            '/admin/clients',
            { search: '', per_page: filters.per_page },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    let hasActiveFilters = $derived(search !== '');
</script>

<svelte:head>
    <title>Daftar Client | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Daftar Client" menuItems={adminMenu}>
    <PageHeader
        title="Daftar Client"
        description="Client yang mendaftar mandiri. Read-only — tidak bisa diedit atau dihapus."
    >
        {#snippet actions()}
            <div
                class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue/5 border border-blue/20"
            >
                <div
                    class="w-6 h-6 rounded-full bg-blue/15 text-blue flex items-center justify-center flex-shrink-0"
                >
                    <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2.5"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                    </svg>
                </div>
                <span class="text-sm font-extrabold text-blue"
                    >{clients.total}</span
                >
                <span class="text-xs font-bold text-gray-600"
                    >Client Terdaftar</span
                >
            </div>
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
            <!-- Info View Mode -->
            <div
                class="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-50 rounded-xl border border-gray-100"
            >
                <div
                    class="w-1.5 h-1.5 rounded-full bg-green animate-pulse"
                ></div>
                <span class="text-xs font-bold text-gray-600"
                    >Mode Read-only</span
                >
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
        {#if clients.data.length === 0}
            <EmptyState
                icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                title={hasActiveFilters
                    ? 'Tidak ada hasil ditemukan'
                    : 'Belum ada client'}
                description={hasActiveFilters
                    ? `Tidak ditemukan client dengan kata kunci "${search}". Coba kata kunci lain.`
                    : 'Client yang mendaftar mandiri akan muncul di sini.'}
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
                                Client
                            </th>
                            <th
                                class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest hidden md:table-cell"
                            >
                                Username
                            </th>
                            <th
                                class="text-left px-6 py-4 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest hidden sm:table-cell"
                            >
                                Terdaftar
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        {#each clients.data as client (client.id)}
                            <tr
                                class="hover:bg-gray-50/70 transition-colors"
                            >
                                <!-- Client -->
                                <td class="px-6 py-4">
                                    <div
                                        class="flex items-center gap-3"
                                    >
                                        <div
                                            class="relative flex-shrink-0"
                                        >
                                            <div
                                                class="w-10 h-10 rounded-full bg-gradient-to-br from-blue to-purple text-white flex items-center justify-center font-bold text-sm shadow-md"
                                            >
                                                {client.name
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
                                                {client.name}
                                            </p>
                                            <p
                                                class="text-xs text-gray-500 truncate"
                                            >
                                                {client.email}
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                <!-- Username -->
                                <td
                                    class="px-6 py-4 hidden md:table-cell"
                                >
                                    {#if client.username}
                                        <span
                                            class="inline-flex items-center gap-1 text-sm font-medium text-gray-600"
                                        >
                                            <span class="text-gray-400"
                                                >@</span
                                            >{client.username}
                                        </span>
                                    {:else}
                                        <span
                                            class="text-sm text-gray-400 italic"
                                            >-</span
                                        >
                                    {/if}
                                </td>

                                <!-- Terdaftar -->
                                <td
                                    class="px-6 py-4 hidden sm:table-cell"
                                >
                                    <div
                                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
                                    >
                                        <svg
                                            class="w-3 h-3"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            stroke-width="2.5"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <span class="text-xs font-bold"
                                            >{formatDate(
                                                client.created_at,
                                            )}</span
                                        >
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <Pagination meta={clients} label="client" />
        {/if}
    </div>
</DashboardLayout>