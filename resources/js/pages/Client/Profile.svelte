<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import { router } from '@inertiajs/svelte';
    import type { User } from '@/types';
    import { hasFormChanges } from '@/utils/form';
    import { clientMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        user: initialUser,
    }: {
        user: Pick<User, 'id' | 'name' | 'username' | 'email' | 'role'>;
    } = $props();

    // ==========================================
    // STATE
    // ==========================================

    // Form state — di-init dari props `initialUser` (initial value).
    // Setelah submit → router.put → Inertia reload → komponen re-mount
    // → form re-init. Jadi tidak perlu sync via $effect.
    // svelte-ignore state_referenced_locally
    let form = $state({
        name: initialUser.name,
        username: initialUser.username ?? '',
    });

    // Snapshot nilai awal untuk "has changes" check.
    // svelte-ignore state_referenced_locally
    let initialForm = {
        name: initialUser.name,
        username: initialUser.username ?? '',
    };

    let errors = $state<Record<string, string>>({});
    let processing = $state(false);
    let errorCount = $derived(Object.keys(errors).length);

    let hasChanges = $derived(hasFormChanges(form, initialForm));

    // ==========================================
    // SUBMIT
    // ==========================================

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        if (!hasChanges) return;

        errors = {};
        processing = true;

        router.put('/client/profile', form, {
            preserveScroll: true,
            onError: (err) => {
                errors = err as Record<string, string>;
                processing = false;
            },
            onFinish: () => {
                processing = false;
            },
        });
    }

    function resetForm() {
        form.name = initialForm.name;
        form.username = initialForm.username;
        errors = {};
    }
</script>

<svelte:head>
    <title>Profile Saya | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Profile Saya" menuItems={clientMenu}>
    <PageHeader
        title="Profile Saya"
        description="Kelola informasi akun Anda. Email tidak dapat diubah."
    />

    <!-- Error Alert -->
    {#if errorCount > 0}
        <div
            class="mb-5 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-3"
        >
            <svg
                class="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
            >
                <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                />
            </svg>
            <div>
                <p class="text-sm text-red-700 font-bold">
                    Terdapat {errorCount} kesalahan pada form
                </p>
                <p class="text-xs text-red-600 mt-0.5">
                    Silakan periksa kembali data yang Anda masukkan.
                </p>
            </div>
        </div>
    {/if}

    <form onsubmit={handleSubmit} class="max-w-2xl mx-auto space-y-5">
        <!-- ==========================================
             CARD HEADER: Avatar + Info
        ========================================== -->
        <div
            class="bg-linear-to-br from-green-dark to-blue rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden"
        >
            <div
                class="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full"
                aria-hidden="true"
            ></div>
            <div
                class="absolute -bottom-12 -left-12 w-32 h-32 bg-white/10 rounded-full"
                aria-hidden="true"
            ></div>

            <div class="relative z-10 flex items-center gap-5">
                <div
                    class="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-extrabold text-3xl shadow-lg shrink-0 border-2 border-white/30"
                    data-testid="avatar-preview"
                >
                    {form.name?.charAt(0)?.toUpperCase() || '?'}
                </div>

                <div class="flex-1 min-w-0">
                    <div
                        class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold mb-1.5"
                    >
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
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                        </svg>
                        CLIENT
                    </div>
                    <h2 class="text-2xl font-extrabold truncate">
                        {form.name || 'Client'}
                    </h2>
                    <p class="text-sm text-white/80 truncate">
                        @{form.username || 'username'}
                    </p>
                </div>
            </div>
        </div>

        <!-- ==========================================
             CARD: Form Edit
        ========================================== -->
        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
        >
            <div
                class="p-5 sm:p-6 border-b border-gray-100 flex items-center gap-3"
            >
                <div
                    class="w-9 h-9 rounded-2xl bg-blue/10 text-blue flex items-center justify-center shrink-0"
                >
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                    </svg>
                </div>
                <div>
                    <h3 class="text-base font-extrabold text-dark">
                        Edit Profile
                    </h3>
                    <p class="text-xs text-gray-500">
                        Ubah nama & username Anda
                    </p>
                </div>
            </div>

            <div class="p-5 sm:p-6 space-y-5">
                <!-- Nama Lengkap -->
                <div>
                    <label
                        for="name"
                        class="block text-xs font-bold text-dark mb-1.5"
                    >
                        Nama Lengkap <span class="text-pink">*</span>
                    </label>
                    <input
                        id="name"
                        type="text"
                        bind:value={form.name}
                        required
                        placeholder="Nama lengkap"
                        class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                            {errors.name
                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                    />
                    {#if errors.name}
                        <p class="text-pink text-[11px] mt-1 font-bold">
                            {errors.name}
                        </p>
                    {/if}
                </div>

                <!-- Username -->
                <div>
                    <label
                        for="username"
                        class="block text-xs font-bold text-dark mb-1.5"
                    >
                        Username
                    </label>
                    <div class="relative">
                        <span
                            class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none"
                            >@</span
                        >
                        <input
                            id="username"
                            type="text"
                            bind:value={form.username}
                            placeholder="username unik"
                            class="w-full pl-9 pr-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                                {errors.username
                                ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                        />
                    </div>
                    {#if errors.username}
                        <p class="text-pink text-[11px] mt-1 font-bold">
                            {errors.username}
                        </p>
                    {/if}
                </div>

                <!-- Email (read-only) -->
                <div>
                    <label
                        for="email"
                        class="block text-xs font-bold text-dark mb-1.5 flex items-center gap-1.5"
                    >
                        Email
                        <span
                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold"
                        >
                            <svg
                                class="w-2.5 h-2.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2.5"
                                aria-hidden="true"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                            Read-only
                        </span>
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={initialUser.email}
                        readonly
                        disabled
                        class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-sm font-medium text-gray-500 cursor-not-allowed"
                    />
                    <p class="text-[11px] text-gray-500 mt-1">
                        Email tidak dapat diubah. Hubungi admin jika
                        perlu diperbarui.
                    </p>
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col-reverse sm:flex-row gap-2">
            <button
                type="button"
                onclick={resetForm}
                disabled={!hasChanges || processing}
                class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                </svg>
                Reset
            </button>
            <button
                type="submit"
                disabled={processing || !hasChanges}
                class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
                {#if processing}
                    <svg
                        class="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                        ></circle>
                        <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        ></path>
                    </svg>
                    Menyimpan...
                {:else}
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
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                    Simpan Perubahan
                {/if}
            </button>
        </div>
    </form>
</DashboardLayout>