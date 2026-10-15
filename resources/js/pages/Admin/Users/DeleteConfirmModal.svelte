<script lang="ts">
    let {
        open = $bindable(false),
        userName = '',
        onConfirm = undefined,
    }: {
        open?: boolean;
        userName?: string;
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
            aria-labelledby="delete-modal-title"
            class="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8"
        >
            <div class="text-center">
                <div class="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </div>
                <h2 id="delete-modal-title" class="text-xl font-extrabold text-dark mb-2">Hapus User?</h2>
                <p class="text-sm text-gray-500 mb-6">
                    Yakin ingin menghapus <span class="font-bold text-dark">{userName}</span>?
                    Tindakan ini tidak bisa dibatalkan.
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
                        class="flex-1 px-6 py-3 rounded-full bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-all shadow-md"
                    >
                        Ya, Hapus
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}