<script lang="ts">
    import { inertia } from '@inertiajs/svelte';

    type Color = 'pink' | 'sun' | 'blue' | 'green' | 'gray' | 'red' | 'purple';

    let {
        label,
        value,
        href = null,
        color = 'pink' as Color,
    }: {
        label: string;
        value: number | string;
        href?: string | null;
        color?: Color;
    } = $props();

    const colorClasses: Record<Color, { bg: string; text: string; border: string }> = {
        pink: {
            bg: 'bg-pink/10',
            text: 'text-pink-text',
            border: 'border-pink/20',
        },
        sun: {
            bg: 'bg-sun/10',
            text: 'text-sun-text',
            border: 'border-sun/20',
        },
        blue: {
            bg: 'bg-blue/10',
            text: 'text-blue-text',
            border: 'border-blue/20',
        },
        green: {
            bg: 'bg-green/10',
            text: 'text-green-text',
            border: 'border-green/20',
        },
        gray: {
            bg: 'bg-gray-100',
            text: 'text-gray-700',
            border: 'border-gray-200',
        },
        red: {
            bg: 'bg-red-50',
            text: 'text-red-700',
            border: 'border-red-200',
        },
        purple: {
            bg: 'bg-purple/10',
            text: 'text-purple-text',
            border: 'border-purple/20',
        },
    };

    let c = $derived(colorClasses[color]);
</script>

{#if href}
    <a
        {href}
        use:inertia
        class="group block bg-white rounded-2xl border {c.border} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-4"
    >
        <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
                <p class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1 truncate">
                    {label}
                </p>
                <p class="text-2xl font-extrabold text-dark leading-none">
                    {value}
                </p>
            </div>
            <div class="w-9 h-9 rounded-xl {c.bg} {c.text} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
            </div>
        </div>
    </a>
{:else}
    <div class="bg-white rounded-2xl border {c.border} shadow-sm p-4">
        <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
                <p class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1 truncate">
                    {label}
                </p>
                <p class="text-2xl font-extrabold text-dark leading-none">
                    {value}
                </p>
            </div>
            <div class="w-9 h-9 rounded-xl {c.bg} {c.text} flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            </div>
        </div>
    </div>
{/if}