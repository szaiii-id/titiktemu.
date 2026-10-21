<script lang="ts">
    /**
     * BackButton — breadcrumb "← Kembali ke X" dengan link Inertia.
     *
     * @example
     *   <BackButton href="/admin/packages" label="Kembali ke Daftar Paket" />
     */

    import { inertia } from '@inertiajs/svelte';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        href,
        label = 'Kembali',
    }: {
        href: string;
        label?: string;
    } = $props();
</script>

<div class="mb-5">
    <a
        {href}
        use:inertia
        class="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-pink-text transition-colors"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
        </svg>
        {label}
    </a>
</div>