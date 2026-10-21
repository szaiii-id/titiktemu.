<script lang="ts">
    /**
     * ConfirmModal — modal konfirmasi generik.
     *
     * Mendukung variant (danger/warning/success/info), optional reason textarea,
     * dan custom body via `children` snippet.
     *
     * @example Basic
     *   <ConfirmModal
     *       bind:open={showDeleteModal}
     *       variant="danger"
     *       title="Hapus Paket?"
     *       description="Tindakan ini tidak bisa dibatalkan."
     *       confirmLabel="Ya, Hapus"
     *       onConfirm={deletePackage}
     *   />
     *
     * @example Dengan Reason
     *   <ConfirmModal
     *       bind:open={showRejectModal}
     *       variant="danger"
     *       title="Tolak Laporan?"
     *       description="Mitra harus upload ulang."
     *       requiresReason
     *       bind:reasonValue={reason}
     *       reasonError={errors.reason}
     *       confirmLabel="Ya, Tolak"
     *       onConfirm={submitReject}
     *   />
     *
     * @example Dengan Custom Body (children)
     *   <ConfirmModal
     *       bind:open={showVerifyModal}
     *       variant="success"
     *       title="Verifikasi Pembayaran?"
     *       confirmLabel="Ya, Verifikasi"
     *       onConfirm={submitVerify}
     *   >
     *       {#snippet children()}
     *           <label for="catatan" class="...">Catatan</label>
     *           <textarea id="catatan" bind:value={catatan} ...></textarea>
     *       {/snippet}
     *   </ConfirmModal>
     */

    import type { Snippet } from 'svelte';

    // ==========================================
    // TYPES
    // ==========================================

    type Variant = 'danger' | 'warning' | 'success' | 'info';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        open = $bindable(false),
        variant = 'info',
        title,
        description = '',
        confirmLabel = 'Ya, Lanjutkan',
        cancelLabel = 'Batal',
        processing = false,
        disabled = false,
        requiresReason = false,
        reasonLabel = 'Alasan',
        reasonPlaceholder = '',
        reasonValue = $bindable(''),
        reasonError = '',
        minReasonLength = 5,
        onConfirm,
        onCancel = undefined,
        children = undefined as Snippet | undefined,
    }: {
        open?: boolean;
        variant?: Variant;
        title: string;
        description?: string;
        confirmLabel?: string;
        cancelLabel?: string;
        processing?: boolean;
        disabled?: boolean;
        requiresReason?: boolean;
        reasonLabel?: string;
        reasonPlaceholder?: string;
        reasonValue?: string;
        reasonError?: string;
        minReasonLength?: number;
        onConfirm: () => void;
        onCancel?: (() => void) | undefined;
        children?: Snippet;
    } = $props();

    // ==========================================
    // STYLING MAPS
    // ==========================================

    const iconBgClass: Record<Variant, string> = {
        danger: 'bg-red-100',
        warning: 'bg-sun/10',
        success: 'bg-green/10',
        info: 'bg-blue/10',
    };

    const iconColorClass: Record<Variant, string> = {
        danger: 'text-red-600',
        warning: 'text-sun-text',
        success: 'text-green-text',
        info: 'text-blue',
    };

    const iconPath: Record<Variant, string> = {
        danger:
            'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        warning:
            'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        success:
            'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    };

    const confirmClass: Record<Variant, string> = {
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-sun-dark hover:bg-sun text-white',
        success: 'bg-green-dark hover:bg-green text-white',
        info: 'bg-pink-dark hover:bg-sun-dark text-white',
    };

    // ==========================================
    // DERIVED
    // ==========================================

    let canConfirm = $derived(
        !processing &&
            !disabled &&
            (!requiresReason ||
                reasonValue.trim().length >= minReasonLength),
    );

    // ==========================================
    // HANDLERS
    // ==========================================

    function close(): void {
        if (processing) return;
        open = false;
        onCancel?.();
    }

    function confirm(): void {
        if (!canConfirm) return;
        onConfirm();
    }

    function handleKeydown(e: KeyboardEvent): void {
        if (e.key === 'Escape') close();
    }
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
    >
        <button
            type="button"
            class="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
            onclick={close}
            aria-label="Tutup modal"
        ></button>

        <div
            class="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
        >
            <div class="flex items-start gap-4 mb-5">
                <div
                    class="w-12 h-12 rounded-2xl {iconBgClass[
                        variant
                    ]} flex items-center justify-center flex-shrink-0"
                >
                    <svg
                        class="w-6 h-6 {iconColorClass[variant]}"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d={iconPath[variant]}
                        />
                    </svg>
                </div>
                <div class="flex-1 min-w-0">
                    <h3
                        id="confirm-modal-title"
                        class="text-lg font-extrabold text-dark mb-1"
                    >
                        {title}
                    </h3>
                    {#if description}
                        <p class="text-sm text-gray-600 leading-relaxed">
                            {description}
                        </p>
                    {/if}
                </div>
            </div>

            {#if children}
                <div class="mb-4">
                    {@render children()}
                </div>
            {/if}

            {#if requiresReason}
                <div class="mb-4">
                    <label
                        for="confirm-reason"
                        class="block text-xs font-bold text-dark mb-1.5"
                    >
                        {reasonLabel} <span class="text-pink">*</span>
                    </label>
                    <textarea
                        id="confirm-reason"
                        bind:value={reasonValue}
                        rows="3"
                        required
                        placeholder={reasonPlaceholder}
                        disabled={processing}
                        class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all resize-none
                            {reasonError
                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                        aria-invalid={reasonError ? 'true' : undefined}
                    ></textarea>
                    {#if reasonError}
                        <p
                            class="text-pink text-[11px] mt-1 font-bold"
                            aria-live="polite"
                        >
                            {reasonError}
                        </p>
                    {/if}
                </div>
            {/if}

            <div class="flex gap-2">
                <button
                    type="button"
                    onclick={close}
                    disabled={processing}
                    class="flex-1 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                    {cancelLabel}
                </button>
                <button
                    type="button"
                    onclick={confirm}
                    disabled={!canConfirm}
                    class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full {confirmClass[
                        variant
                    ]} font-bold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                        Memproses...
                    {:else}
                        {confirmLabel}
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}