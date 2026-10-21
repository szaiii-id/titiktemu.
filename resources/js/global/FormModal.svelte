<script lang="ts">
    /**
     * FormModal — modal dengan body form (slot) + footer.
     *
     * @example
     *   <FormModal
     *       bind:open={showDayModal}
     *       title="Tambah Hari"
     *       processing={dayProcessing}
     *       submitLabel="Tambah"
     *       onSubmit={submitDay}
     *   >
     *       {#snippet children()}
     *           <input type="text" bind:value={form.judul} ... />
     *       {/snippet}
     *   </FormModal>
     */

    import type { Snippet } from 'svelte';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        open = $bindable(false),
        title,
        description = '',
        processing = false,
        submitLabel = 'Simpan',
        cancelLabel = 'Batal',
        maxWidth = 'lg',
        onSubmit,
        onCancel = undefined,
        children,
        footer = undefined,
    }: {
        open?: boolean;
        title: string;
        description?: string;
        processing?: boolean;
        submitLabel?: string;
        cancelLabel?: string;
        maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
        onSubmit: () => void;
        onCancel?: (() => void) | undefined;
        children: Snippet;
        footer?: Snippet;
    } = $props();

    // ==========================================
    // STYLING
    // ==========================================

    const widthClass: Record<typeof maxWidth, string> = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    };

    // ==========================================
    // HANDLERS
    // ==========================================

    function close(): void {
        if (processing) return;
        open = false;
        onCancel?.();
    }

    function submit(e: SubmitEvent): void {
        e.preventDefault();
        if (processing) return;
        onSubmit();
    }

    function handleBackdrop(e: MouseEvent): void {
        if (e.target === e.currentTarget) close();
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
        aria-labelledby="form-modal-title"
    >
        <button
            type="button"
            class="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
            onclick={close}
            aria-label="Tutup modal"
        ></button>

        <div
            class="relative bg-white rounded-3xl shadow-2xl w-full max-h-[90vh] overflow-y-auto {widthClass[
                maxWidth
            ]}"
        >
            <form onsubmit={submit}>
                <div class="p-5 sm:p-6 border-b border-gray-100">
                    <div class="flex items-start gap-3">
                        <div class="flex-1 min-w-0">
                            <h3
                                id="form-modal-title"
                                class="text-lg font-extrabold text-dark"
                            >
                                {title}
                            </h3>
                            {#if description}
                                <p class="text-xs text-gray-500 mt-1">
                                    {description}
                                </p>
                            {/if}
                        </div>
                        <button
                            type="button"
                            onclick={close}
                            disabled={processing}
                            class="text-gray-400 hover:text-dark transition-colors disabled:opacity-50 flex-shrink-0"
                            aria-label="Tutup"
                        >
                            <svg
                                class="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2.5"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="p-5 sm:p-6 space-y-4">
                    {@render children()}
                </div>

                <div class="p-4 sm:p-5 bg-gray-50/50 flex flex-col-reverse sm:flex-row gap-2">
                    {#if footer}
                        {@render footer()}
                    {:else}
                        <button
                            type="button"
                            onclick={close}
                            disabled={processing}
                            class="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-50"
                        >
                            {cancelLabel}
                        </button>
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
                                {submitLabel}
                            {/if}
                        </button>
                    {/if}
                </div>
            </form>
        </div>
    </div>
{/if}