<script lang="ts">
    /**
     * Criterion — indikator checklist kriteria (mis. password strength).
     *
     * @example
     *   <Criterion label="Min. 8 karakter" passed={true} />
     *   <Criterion label="Huruf" passed={false} />
     */

    let {
        label,
        passed = false,
    }: {
        label: string;
        passed?: boolean;
    } = $props();
</script>

<div class="flex items-center gap-1.5 text-[11px]">
    <span
        class="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center {passed
            ? 'bg-green-100 text-green-600'
            : 'bg-gray-100 text-gray-400'}"
    >
        {#if passed}
            <svg
                class="w-2.5 h-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="3.5"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M5 13l4 4L19 7"
                />
            </svg>
        {:else}
            <svg
                class="w-2.5 h-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="3.5"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                />
            </svg>
        {/if}
    </span>
    <span
        class="{passed
            ? 'text-green-700 font-bold'
            : 'text-gray-500'}">{label}</span
    >
</div>