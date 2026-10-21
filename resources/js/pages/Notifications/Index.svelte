<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import EmptyState from '@/global/EmptyState.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import Pagination from '@/global/Pagination.svelte';
    import { inertia, router, page } from '@inertiajs/svelte';
    import type { AppNotification, PaginationMeta } from '@/types';
    import { formatDateTime } from '@/utils/formatDate';
    import { adminMenu, clientMenu, mitraMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type NotificationItem = Pick<
        AppNotification,
        'id' | 'tipe' | 'judul' | 'pesan' | 'data' | 'read_at' | 'created_at'
    >;

    let {
        notifications,
        unreadCount = 0,
    }: {
        notifications: PaginationMeta & { data: NotificationItem[] };
        unreadCount: number;
    } = $props();

    // ==========================================
    // DYNAMIC MENU
    // ==========================================

    let role = $derived(page.props.auth?.user?.role);

    let activeMenu = $derived(
        role === 'admin'
            ? adminMenu
            : role === 'mitra'
              ? mitraMenu
              : clientMenu,
    );

    // ==========================================
    // HANDLERS
    // ==========================================

    function markAsRead(id: string) {
        router.post(
            `/notifications/${id}/read`,
            {},
            { preserveScroll: true },
        );
    }

    function markAllRead() {
        router.post(
            '/notifications/mark-all-read',
            {},
            { preserveScroll: true },
        );
    }
</script>

<svelte:head><title>Notifikasi | Titiktemu</title></svelte:head>

<DashboardLayout title="Notifikasi" menuItems={activeMenu}>
    <!-- Header -->
    <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
    >
        <div>
            <h1 class="text-2xl font-extrabold text-dark">Notifikasi</h1>
            <p class="text-sm text-gray-500 mt-1">
                {unreadCount} belum dibaca
            </p>
        </div>
        {#if unreadCount > 0}
            <button
                type="button"
                onclick={markAllRead}
                class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md self-start sm:self-auto"
            >
                <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M5 13l4 4L19 7"
                    />
                </svg>
                Tandai Semua Dibaca
            </button>
        {/if}
    </div>

    <!-- Card -->
    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
    >
        {#if notifications.data.length === 0}
            <EmptyState
                icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                title="Belum ada notifikasi"
                description="Notifikasi akan muncul di sini."
            />
        {:else}
            <div class="divide-y divide-gray-100">
                {#each notifications.data as n (n.id)}
                    <button
                        type="button"
                        onclick={() => markAsRead(n.id)}
                        class="w-full text-left p-4 sm:p-5 hover:bg-gray-50/70 transition-colors {n.read_at
                            ? ''
                            : 'bg-blue/5'}"
                    >
                        <div class="flex items-start gap-3">
                            <div
                                class="w-10 h-10 rounded-xl {n.read_at
                                    ? 'bg-gray-100 text-gray-500'
                                    : 'bg-pink/10 text-pink-text'} flex items-center justify-center flex-shrink-0"
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
                                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                    />
                                </svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-dark">
                                    {n.judul}
                                </p>
                                <p class="text-xs text-gray-600 mt-0.5">
                                    {n.pesan}
                                </p>
                                <p
                                    class="text-[11px] text-gray-400 mt-1"
                                >
                                    {formatDateTime(n.created_at)}
                                </p>
                            </div>
                            {#if !n.read_at}
                                <span
                                    class="w-2 h-2 rounded-full bg-pink-dark flex-shrink-0 mt-2"
                                    aria-label="Belum dibaca"
                                ></span>
                            {/if}
                        </div>
                    </button>
                {/each}
            </div>

            <!-- Pagination -->
            <Pagination meta={notifications} label="notifikasi" />
        {/if}
    </div>
</DashboardLayout>