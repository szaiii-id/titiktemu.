<script lang="ts">
    import type { FullAutoFill } from 'svelte/elements';

    let {
        id,
        label = '',
        type = 'text',
        value = $bindable(''),
        placeholder = '',
        error = null,
        hint = null,
        required = false,
        disabled = false,
        readonly = false,
        autocomplete = 'off' as FullAutoFill,
        ...rest
    }: {
        id: string;
        label?: string;
        type?: string;
        value?: string;
        placeholder?: string;
        error?: string | null;
        hint?: string | null;
        required?: boolean;
        disabled?: boolean;
        readonly?: boolean;
        autocomplete?: FullAutoFill;
        [key: string]: any;
    } = $props();
</script>


<div>
    {#if label}
        <label for={id} class="block text-sm font-extrabold text-dark mb-2">
            {label}
            {#if required}<span class="text-pink">*</span>{/if}
        </label>
    {/if}

    <input
        {id}
        {type}
        bind:value
        {placeholder}
        {required}
        {disabled}
        {readonly}
        {autocomplete}
        class={[
            'appearance-none block w-full px-5 py-3.5 border rounded-2xl',
            'placeholder-gray-400 focus:outline-none focus:ring-2 transition-all sm:text-sm font-medium',
            error
                ? 'border-red-300 bg-red-50 focus:ring-red-200 focus:border-red-500'
                : 'border-gray-200 bg-gray-50 focus:ring-blue/20 focus:border-blue focus:bg-white',
            disabled || readonly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : '',
        ].join(' ')}
        {...rest}
    />

    {#if error}
        <p class="text-pink text-xs mt-1.5 font-bold">{error}</p>
    {:else if hint}
        <p class="text-gray-500 text-xs mt-1.5">{hint}</p>
    {/if}
</div>