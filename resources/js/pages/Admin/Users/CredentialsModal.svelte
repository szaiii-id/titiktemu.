<script lang="ts">
    type Credentials = {
        role: string;
        name: string;
        email: string;
        username: string | null;
        password: string;
    };

    let {
        open = $bindable(false),
        credentials = null,
    }: {
        open?: boolean;
        credentials: Credentials | null;
    } = $props();

    let copied = $state<string | null>(null);

    function copy(text: string, key: string) {
        navigator.clipboard.writeText(text).then(() => {
            copied = key;
            setTimeout(() => (copied = null), 2000);
        });
    }

    function copyAll() {
        if (!credentials) return;
        const text = [
            `Role: ${credentials.role}`,
            `Nama: ${credentials.name}`,
            `Email: ${credentials.email}`,
            `Username: ${credentials.username ?? '-'}`,
            `Password: ${credentials.password}`,
        ].join('\n');
        copy(text, 'all');
    }

    function close() {
        open = false;
    }
</script>

{#if open && credentials}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop — ✅ FIX A11Y: <div> → <button> -->
        <button
            type="button"
            class="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
            onclick={close}
            aria-label="Tutup modal"
        ></button>

        <!-- Modal -->
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="credentials-modal-title"
            class="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        >
            <!-- Header -->
            <div class="text-center mb-6">
                <div class="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 id="credentials-modal-title" class="text-2xl font-extrabold text-dark">Kredensial User</h2>
                <p class="text-sm text-gray-500 mt-2">
                    Simpan & sampaikan kredensial ini ke user <span class="font-bold text-dark">di luar aplikasi</span>.
                </p>
            </div>

            <!-- Warning -->
            <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-2xl flex items-start gap-3 mb-6">
                <svg class="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <div>
                    <p class="text-sm text-yellow-700 font-bold">Password hanya muncul 1x</p>
                    <p class="text-xs text-yellow-700 mt-1">
                        Salin sekarang. Jika hilang, Anda harus reset password lagi.
                    </p>
                </div>
            </div>

            <!-- Credentials List -->
            <div class="space-y-3 mb-6">
                <!-- Role -->
                <div class="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-2xl">
                    <div class="min-w-0">
                        <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Role</p>
                        <p class="text-sm font-bold text-dark capitalize">{credentials.role}</p>
                    </div>
                </div>

                <!-- Nama -->
                <div class="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-2xl">
                    <div class="min-w-0">
                        <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Nama</p>
                        <p class="text-sm font-bold text-dark truncate">{credentials.name}</p>
                    </div>
                </div>

                <!-- Email -->
                <div class="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-2xl">
                    <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</p>
                        <p class="text-sm font-bold text-dark truncate">{credentials.email}</p>
                    </div>
                    <button
                        type="button"
                        onclick={() => copy(credentials.email, 'email')}
                        class="flex-shrink-0 p-2 rounded-lg text-gray-600 hover:bg-white hover:text-blue transition-colors"
                        aria-label="Salin email"
                    >
                        {#if copied === 'email'}
                            <svg class="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        {:else}
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        {/if}
                    </button>
                </div>

                <!-- Username -->
                {#if credentials.username}
                    <div class="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-2xl">
                        <div class="min-w-0 flex-1">
                            <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Username</p>
                            <p class="text-sm font-bold text-dark truncate">{credentials.username}</p>
                        </div>
                        <button
                            type="button"
                            onclick={() => copy(credentials.username!, 'username')}
                            class="flex-shrink-0 p-2 rounded-lg text-gray-600 hover:bg-white hover:text-blue transition-colors"
                            aria-label="Salin username"
                        >
                            {#if copied === 'username'}
                                <svg class="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            {:else}
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            {/if}
                        </button>
                    </div>
                {/if}

                <!-- Password -->
                <div class="flex items-center justify-between gap-3 p-4 bg-pink/5 border border-pink/20 rounded-2xl">
                    <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold text-pink uppercase tracking-wider">Password</p>
                        <p class="text-sm font-bold text-dark font-mono truncate">{credentials.password}</p>
                    </div>
                    <button
                        type="button"
                        onclick={() => copy(credentials.password, 'password')}
                        class="flex-shrink-0 p-2 rounded-lg text-gray-600 hover:bg-white hover:text-pink transition-colors"
                        aria-label="Salin password"
                    >
                        {#if copied === 'password'}
                            <svg class="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        {:else}
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        {/if}
                    </button>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col sm:flex-row gap-3">
                <button
                    type="button"
                    onclick={copyAll}
                    class="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md"
                >
                    {#if copied === 'all'}
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Tersalin!
                    {:else}
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Salin Semua
                    {/if}
                </button>
                <button
                    type="button"
                    onclick={close}
                    class="flex-1 px-6 py-3 rounded-full bg-gray-100 text-dark font-bold text-sm hover:bg-gray-200 transition-all"
                >
                    Tutup
                </button>
            </div>
        </div>
    </div>
{/if}
