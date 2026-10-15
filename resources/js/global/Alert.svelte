<script lang="ts">
    type Variant = 'success' | 'error' | 'warning' | 'info';

    let {
        variant = 'info',
        title = null,
        message = null,
        dismissible = false,
        children,
    }: {
        variant?: Variant;
        title?: string | null;
        message?: string | null;
        dismissible?: boolean;
        children?: any;
    } = $props();

    let visible = $state(true);

    const config: Record<Variant, { bg: string; border: string; text: string; icon: string }> = {
        success: {
            bg: 'bg-green-50',
            border: 'border-green-500',
            text: 'text-green-700',
            icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
        },
        error: {
            bg: 'bg-red-50',
            border: 'border-red-500',
            text: 'text-red-700',
            icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z',
        },
        warning: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-500',
            text: 'text-yellow-700',
            icon: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z',
        },
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-500',
            text: 'text-blue-700',
            icon: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z',
        },
    };

    let c = $derived(config[variant]);
</script>

{#if visible}
    <div class="{c.bg} {c.border} border-l-4 p-4 rounded-r-2xl flex items-start gap-3">
        <svg class="w-5 h-5 {c.text} flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d={c.icon} clip-rule="evenodd" />
        </svg>

        <div class="flex-1">
            {#if title}
                <p class="text-sm {c.text} font-bold">{title}</p>
            {/if}
            {#if message}
                <p class="text-sm {c.text} {title ? 'mt-1' : ''}">{message}</p>
            {/if}
            {@render children?.()}
        </div>

        {#if dismissible}
            <button
                type="button"
                onclick={() => (visible = false)}
                class="{c.text} hover:opacity-70 transition-opacity"
                aria-label="Tutup"
            >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        {/if}
    </div>
{/if}