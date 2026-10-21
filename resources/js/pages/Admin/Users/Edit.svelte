<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import BackButton from '@/global/BackButton.svelte';
    import { inertia, router } from '@inertiajs/svelte';
    import type { Profile, User } from '@/types';
    import { adminMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type EditUser = Pick<
        User,
        'id' | 'name' | 'username' | 'email' | 'role'
    > & {
        role: 'admin' | 'mitra';
        profile: Pick<
            Profile,
            | 'nama_penyedia_usaha'
            | 'nomor_identitas'
            | 'alamat'
            | 'telepon'
            | 'provinsi'
            | 'kota'
            | 'kode_pos'
            | 'deskripsi'
        > | null;
    };

    let { user }: { user: EditUser } = $props();

    // ==========================================
    // STATE
    // ==========================================

    // Form state — di-init dari props `user` (initial value).
    // Setelah submit → router.put() → Inertia reload → komponen re-mount
    // → form re-init dari user baru. Jadi tidak perlu sync via $effect.
    // svelte-ignore state_referenced_locally
    let form = $state({
        name: user.name,
        username: user.username ?? '',
        email: user.email,
        profile: {
            nama_penyedia_usaha: user.profile?.nama_penyedia_usaha ?? '',
            nomor_identitas: user.profile?.nomor_identitas ?? '',
            alamat: user.profile?.alamat ?? '',
            telepon: user.profile?.telepon ?? '',
            provinsi: user.profile?.provinsi ?? '',
            kota: user.profile?.kota ?? '',
            kode_pos: user.profile?.kode_pos ?? '',
            deskripsi: user.profile?.deskripsi ?? '',
        },
    });

    let errors = $state<Record<string, string>>({});
    let processing = $state(false);

    // ==========================================
    // HANDLERS
    // ==========================================

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        errors = {};
        processing = true;

        router.put(`/admin/users/${user.id}`, form, {
            onError: (err) => {
                errors = err as Record<string, string>;
                processing = false;
            },
            onFinish: () => {
                processing = false;
            },
        });
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
    <title>Edit User | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Edit User" menuItems={adminMenu}>
    <BackButton
        href="/admin/users"
        label="Kembali ke Daftar User"
    />

    <div class="max-w-3xl mx-auto">
        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
        >
            <!-- HEADER: Avatar + Info User -->
            <div
                class="p-5 sm:p-6 border-b border-gray-100 flex items-center gap-4"
            >
                <div
                    class="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-dark to-purple text-white flex items-center justify-center font-extrabold text-lg shadow-md flex-shrink-0"
                >
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                        <h2
                            class="text-lg font-extrabold text-dark truncate"
                        >
                            Edit {user.name}
                        </h2>
                        <span
                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold {roleBadgeClass(
                                user.role,
                            )}"
                        >
                            {roleLabel(user.role)}
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 truncate">
                        {user.email}
                    </p>
                </div>
            </div>

            <!-- FORM -->
            <form onsubmit={handleSubmit}>
                <!-- === DATA AKUN === -->
                <div class="p-5 sm:p-6 border-b border-gray-100">
                    <div class="flex items-center gap-2 mb-4">
                        <div
                            class="w-7 h-7 rounded-lg bg-purple/10 text-purple flex items-center justify-center flex-shrink-0"
                        >
                            <svg
                                class="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                            </svg>
                        </div>
                        <h3
                            class="text-sm font-extrabold text-dark uppercase tracking-wider"
                        >
                            Data Akun
                        </h3>
                    </div>

                    <div class="space-y-4">
                        <div
                            class="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >
                            <div>
                                <label
                                    for="name"
                                    class="block text-xs font-bold text-dark mb-1.5"
                                >
                                    Nama <span class="text-pink">*</span>
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
                                    <p
                                        class="text-pink text-[11px] mt-1 font-bold"
                                    >
                                        {errors.name}
                                    </p>
                                {/if}
                            </div>

                            <div>
                                <label
                                    for="email"
                                    class="block text-xs font-bold text-dark mb-1.5"
                                >
                                    Email
                                    <span class="text-pink">*</span>
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    bind:value={form.email}
                                    required
                                    placeholder="email@contoh.com"
                                    class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                                        {errors.email
                                        ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                        : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                                />
                                {#if errors.email}
                                    <p
                                        class="text-pink text-[11px] mt-1 font-bold"
                                    >
                                        {errors.email}
                                    </p>
                                {/if}
                            </div>
                        </div>

                        <div>
                            <label
                                for="username"
                                class="block text-xs font-bold text-dark mb-1.5"
                            >
                                Username
                                <span class="text-gray-400 font-normal"
                                    >(opsional)</span
                                >
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
                                <p
                                    class="text-pink text-[11px] mt-1 font-bold"
                                >
                                    {errors.username}
                                </p>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- === DATA USAHA (Mitra) === -->
                {#if user.role === 'mitra'}
                    <div class="p-5 sm:p-6 border-b border-gray-100">
                        <div class="flex items-center gap-2 mb-4">
                            <div
                                class="w-7 h-7 rounded-lg bg-blue/10 text-blue flex items-center justify-center flex-shrink-0"
                            >
                                <svg
                                    class="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                    />
                                </svg>
                            </div>
                            <h3
                                class="text-sm font-extrabold text-dark uppercase tracking-wider"
                            >
                                Data Usaha
                            </h3>
                        </div>

                        <div class="space-y-4">
                            <div
                                class="grid grid-cols-1 sm:grid-cols-2 gap-4"
                            >
                                <div>
                                    <label
                                        for="nama_penyedia_usaha"
                                        class="block text-xs font-bold text-dark mb-1.5"
                                        >Nama Usaha</label
                                    >
                                    <input
                                        id="nama_penyedia_usaha"
                                        type="text"
                                        bind:value={
                                            form.profile
                                                .nama_penyedia_usaha
                                        }
                                        placeholder="PT Contoh Travel"
                                        class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label
                                        for="nomor_identitas"
                                        class="block text-xs font-bold text-dark mb-1.5"
                                        >Nomor Identitas</label
                                    >
                                    <input
                                        id="nomor_identitas"
                                        type="text"
                                        bind:value={
                                            form.profile.nomor_identitas
                                        }
                                        placeholder="NIK atau NPWP"
                                        class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    for="telepon"
                                    class="block text-xs font-bold text-dark mb-1.5"
                                    >Telepon</label
                                >
                                <input
                                    id="telepon"
                                    type="text"
                                    bind:value={form.profile.telepon}
                                    placeholder="+62 812 3456 7890"
                                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                />
                            </div>

                            <div>
                                <label
                                    for="alamat"
                                    class="block text-xs font-bold text-dark mb-1.5"
                                    >Alamat</label
                                >
                                <textarea
                                    id="alamat"
                                    bind:value={form.profile.alamat}
                                    rows="2"
                                    placeholder="Alamat lengkap"
                                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all resize-none"
                                ></textarea>
                            </div>

                            <div
                                class="grid grid-cols-1 sm:grid-cols-3 gap-4"
                            >
                                <div>
                                    <label
                                        for="provinsi"
                                        class="block text-xs font-bold text-dark mb-1.5"
                                        >Provinsi</label
                                    >
                                    <input
                                        id="provinsi"
                                        type="text"
                                        bind:value={
                                            form.profile.provinsi
                                        }
                                        class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label
                                        for="kota"
                                        class="block text-xs font-bold text-dark mb-1.5"
                                        >Kota</label
                                    >
                                    <input
                                        id="kota"
                                        type="text"
                                        bind:value={form.profile.kota}
                                        class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label
                                        for="kode_pos"
                                        class="block text-xs font-bold text-dark mb-1.5"
                                        >Kode Pos</label
                                    >
                                    <input
                                        id="kode_pos"
                                        type="text"
                                        bind:value={
                                            form.profile.kode_pos
                                        }
                                        class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    for="deskripsi"
                                    class="block text-xs font-bold text-dark mb-1.5"
                                    >Deskripsi Usaha</label
                                >
                                <textarea
                                    id="deskripsi"
                                    bind:value={
                                        form.profile.deskripsi
                                    }
                                    rows="2"
                                    placeholder="Ceritakan singkat tentang usaha Anda..."
                                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all resize-none"
                                ></textarea>
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- === ACTIONS === -->
                <div
                    class="p-4 sm:p-5 bg-gray-50/50 flex flex-col-reverse sm:flex-row gap-2"
                >
                    <a
                        href="/admin/users"
                        use:inertia
                        class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all"
                    >
                        Batal
                    </a>
                    <button
                        type="submit"
                        disabled={processing}
                        class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {#if processing}
                            <svg
                                class="w-4 h-4 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
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
                            Simpan Perubahan
                        {/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
</DashboardLayout>