<script lang="ts">
    import { inertia, router, page } from '@inertiajs/svelte';

    let {
        title = 'Dashboard',
        menuItems = [],
        children,
    }: {
        title?: string;
        menuItems?: Array<{ label: string; href: string; icon?: string }>;
        children: any;
    } = $props();

    let isSidebarOpen = $state(false);
    let isLoggingOut = $state(false);

    let user = $derived(page.props.auth?.user);

    // 🆕 Logo → dashboard role sendiri
    let dashboardUrl = $derived(
        user?.role === 'admin'
            ? '/admin/dashboard'
            : user?.role === 'mitra'
              ? '/mitra/dashboard'
              : '/client/dashboard'
    );

    function logout() {
        isLoggingOut = true;
        router.post('/logout', {}, {
            onFinish: () => {
                isLoggingOut = false;
            },
        });
    }

    function isActive(href: string): boolean {
        return page.url.startsWith(href);
    }
</script>

<!-- Wrapper utama: background PUTIH -->
<div class="min-h-screen bg-white text-dark relative">

    <!-- EFEK CAHAYA -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div class="absolute -top-32 -left-20 w-[400px] h-[400px] bg-blue rounded-full filter blur-[120px] opacity-10"></div>
        <div class="absolute bottom-10 right-0 w-[500px] h-[500px] bg-pink rounded-full filter blur-[130px] opacity-10"></div>
        <div class="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-sun rounded-full filter blur-[100px] opacity-15"></div>
    </div>

    <!-- Dot pattern -->
    <div class="fixed inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-50 pointer-events-none z-0"></div>

    <!-- ==========================================
         SIDEBAR (FIXED)
    ========================================== -->
    <aside
        class={[
            'fixed top-3 lg:top-6 left-3 lg:left-6 z-40',
            'w-72 h-[calc(100vh-1.5rem)] lg:h-[calc(100vh-3rem)]',
            'bg-white border border-gray-200 rounded-3xl shadow-xl',
            'flex flex-col overflow-hidden',
            'transform transition-transform duration-300 ease-in-out',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%] lg:translate-x-0',
        ].join(' ')}
    >
        <!-- Logo → Dashboard Role -->
        <div class="flex items-center justify-between px-7 py-6 border-b border-gray-200 flex-shrink-0">
            <a
                href={dashboardUrl}
                use:inertia
                class="text-3xl font-extrabold text-dark tracking-tight hover:opacity-80 transition-opacity"
            >
                Titiktemu<span class="text-pink">.</span>
            </a>
            <button
                type="button"
                onclick={() => (isSidebarOpen = false)}
                class="lg:hidden text-gray-400 hover:text-dark"
                aria-label="Tutup menu"
            >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Menu -->
        <nav class="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
            {#each menuItems as item (item.href)}
                <a
                    href={item.href}
                    use:inertia
                    class={[
                        'group flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm',
                        'transition-all duration-200',
                        isActive(item.href)
                            ? 'bg-pink-dark text-white shadow-lg shadow-pink/30'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-dark',
                    ].join(' ')}
                >
                    <span class={[
                        'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center',
                        'transition-colors',
                        isActive(item.href)
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-gray-500 group-hover:bg-pink/10 group-hover:text-pink-dark',
                    ].join(' ')}>
                        {#if item.icon}
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
                            </svg>
                        {/if}
                    </span>
                    <span>{item.label}</span>
                </a>
            {/each}
        </nav>

        <!-- Card CTA -->
        <div class="p-4 flex-shrink-0 mt-auto">
            <div class="bg-gradient-to-br from-pink-dark to-purple rounded-2xl p-5 relative overflow-hidden">
                <div class="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full"></div>
                <div class="absolute -bottom-8 -left-8 w-20 h-20 bg-white/10 rounded-full"></div>
                <div class="relative z-10">
                    <p class="text-xs font-bold text-white/80 uppercase tracking-wider mb-1">
                        Masuk sebagai
                    </p>
                    <p class="text-sm font-extrabold text-white truncate">
                        {user?.name || 'User'}
                    </p>
                    <p class="text-xs text-white/70 truncate mt-1">
                        {user?.email || '-'}
                    </p>
                </div>
            </div>
        </div>
    </aside>

    <!-- Overlay mobile — ✅ FIX A11Y: <div> → <button> -->
    {#if isSidebarOpen}
        <button
            type="button"
            class="fixed inset-0 bg-black/50 z-30 lg:hidden cursor-default"
            onclick={() => (isSidebarOpen = false)}
            aria-label="Tutup sidebar"
        ></button>
    {/if}

    <!-- ==========================================
         MAIN AREA
    ========================================== -->
    <div class="relative z-10 min-h-screen p-3 sm:p-4 lg:p-6">
        <div class="lg:ml-72 xl:ml-80 flex flex-col min-h-full gap-4 lg:gap-6">

            <!-- Topbar -->
            <header class="sticky top-3 lg:top-6 z-20 bg-white border border-gray-200 rounded-3xl shadow-xl h-16 flex items-center justify-between px-4 sm:px-6">
                <div class="flex items-center gap-4">
                    <button
                        type="button"
                        onclick={() => (isSidebarOpen = true)}
                        class="lg:hidden text-dark hover:text-pink-dark"
                        aria-label="Buka menu"
                    >
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div>
                        <h1 class="text-base sm:text-lg font-extrabold text-dark leading-tight">{title}</h1>
                    </div>
                </div>

                <!-- User Info + Logout -->
                <div class="flex items-center gap-3">
                    <div class="hidden sm:flex items-center gap-3">
                        <div class="text-right">
                            <p class="text-sm font-bold text-dark leading-tight truncate max-w-[180px]">
                                @{user?.username || user?.name || 'user'}
                            </p>
                            <p class="text-xs text-gray-500 leading-tight truncate max-w-[180px]">
                                {user?.email || '-'}
                            </p>
                        </div>
                        <div class="w-9 h-9 rounded-full bg-pink-dark text-white flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0">
                            {user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                    </div>

                    <button
                        type="button"
                        onclick={logout}
                        disabled={isLoggingOut}
                        class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        aria-label="Keluar dari akun"
                    >
                        {#if isLoggingOut}
                            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            <span class="hidden sm:inline">Keluar...</span>
                        {:else}
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span class="hidden sm:inline">Keluar</span>
                        {/if}
                    </button>
                </div>
            </header>

            <!-- Content -->
            <main class="flex-1 min-w-0">
                <!-- 🌐 GLOBAL FLASH STATUS -->
                {#if page.props.flash?.status}
                    <div
                        class="mb-5 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-2xl flex items-start gap-3"
                        role="status"
                        aria-live="polite"
                    >
                        <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                        <p class="text-sm text-green-700 font-bold">{page.props.flash.status}</p>
                    </div>
                {/if}

                <!-- 🌐 GLOBAL FLASH ERROR -->
                {#if page.props.flash?.error}
                    <div
                        class="mb-5 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-3"
                        role="alert"
                        aria-live="assertive"
                    >
                        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                        </svg>
                        <p class="text-sm text-red-700 font-bold">{page.props.flash.error}</p>
                    </div>
                {/if}

                {@render children()}
            </main>
        </div>
    </div>
</div>