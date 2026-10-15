<script lang="ts">
    import { router } from '@inertiajs/svelte';

    type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
    type Size = 'sm' | 'md' | 'lg';

    let {
        variant = 'primary',
        size = 'md',
        type = 'button',
        href = null,
        method = 'get',
        disabled = false,
        loading = false,
        fullWidth = false,
        onclick = undefined,
        children,
        ...rest
    }: {
        variant?: Variant;
        size?: Size;
        type?: 'button' | 'submit' | 'reset';
        href?: string | null;
        method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
        disabled?: boolean;
        loading?: boolean;
        fullWidth?: boolean;
        onclick?: ((e: MouseEvent) => void) | undefined;
        children: any;
        [key: string]: any;
    } = $props();

    const variantClasses: Record<Variant, string> = {
        primary: 'bg-pink-dark text-white hover:bg-sun-dark focus:ring-pink-dark',
        secondary: 'bg-gray-100 text-dark hover:bg-gray-200 focus:ring-gray-400 border border-gray-200',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        success: 'bg-green-dark text-white hover:bg-green focus:ring-green-dark',
        ghost: 'bg-transparent text-dark hover:bg-gray-100 focus:ring-gray-300',
    };

    const sizeClasses: Record<Size, string> = {
        sm: 'px-4 py-2 text-xs',
        md: 'px-6 py-3 text-sm',
        lg: 'px-8 py-4 text-base',
    };

    let classes = $derived(
        [
            'inline-flex items-center justify-center gap-2 rounded-full font-bold',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
            variantClasses[variant],
            sizeClasses[size],
            fullWidth ? 'w-full' : '',
            !disabled && !loading ? 'hover:-translate-y-0.5' : '',
        ].join(' ')
    );

    function handleClick(e: MouseEvent) {
        if (disabled || loading) return;

        if (href && method !== 'get') {
            e.preventDefault();
            router[method](href);
            return;
        }

        onclick?.(e);
    }
</script>

{#if href && method === 'get'}
    <a {href} class={classes} {...rest}>
        {#if loading}
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
        {/if}
        {@render children()}
    </a>
{:else}
    <button
        {type}
        class={classes}
        disabled={disabled || loading}
        onclick={handleClick}
        {...rest}
    >
        {#if loading}
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
        {/if}
        {@render children()}
    </button>
{/if}