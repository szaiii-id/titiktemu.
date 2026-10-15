<script lang="ts">
    let {
        open = $bindable(false),
        userName = '',
        userEmail = '',
        onConfirm = undefined,
    }: {
        open?: boolean;
        userName?: string;
        userEmail?: string;
        onConfirm?: (() => void) | undefined;
    } = $props();

    function close() {
        open = false;
    }

    function confirm() {
        onConfirm?.();
    }
</script>

{#if open}
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
            aria-labelledby="reset-password-modal-title"
            class="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8"
        >
            <div class="text-center">
                <div class="w-16 h-16 mx-auto rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                </div>
                <h2 id="reset-password-modal-title" class="text-xl font-extrabold text-dark mb-2">Reset Password?</h2>
                <p class="text-sm text-gray-500 mb-2">
                    Yakin ingin mereset password user berikut?
                </p>
                <div class="bg-gray-50 rounded-2xl p-4 mb-6 text-left">
                    <p class="text-sm font-bold text-dark truncate">{userName}</p>
                    <p class="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>
                <p class="text-xs text-gray-500 mb-6">
                    Password baru akan <strong>ditampilkan sekali</strong> dan user harus menggantinya saat login.
                </p>

                <div class="flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onclick={close}
                        class="flex-1 px-6 py-3 rounded-full bg-gray-100 text-dark font-bold text-sm hover:bg-gray-200 transition-all"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onclick={confirm}
                        class="flex-1 px-6 py-3 rounded-full bg-yellow-500 text-white font-bold text-sm hover:bg-yellow-600 transition-all shadow-md"
                    >
                        Ya, Reset Password
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}