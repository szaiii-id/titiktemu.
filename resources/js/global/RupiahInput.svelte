<script lang="ts">
    import { parseRupiah, formatRupiahInput } from '@/utils/form';

    let {
        value = $bindable(0),
        id = '',
        name = '',
        placeholder = '0',
        required = false,
        disabled = false,
        error = '',
        label = '',
        hint = '',
    }: {
        value?: number;
        id?: string;
        name?: string;
        placeholder?: string;
        required?: boolean;
        disabled?: boolean;
        error?: string;
        label?: string;
        hint?: string;
    } = $props();

    let displayValue = $state(formatRupiahInput(value));
    let isFocused = $state(false);

    $effect(() => {
        const formatted = formatRupiahInput(value);
        if (!isFocused && formatted !== displayValue) {
            displayValue = formatted;
        }
    });

    function handleInput(e: Event): void {
        const target = e.target as HTMLInputElement;
        const raw = target.value;

        const digitsOnly = raw.replace(/\D/g, '');
        const num = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10);

        value = num;
        displayValue = formatRupiahInput(num);

        // Pastikan DOM sinkron meski displayValue sama dengan sebelumnya
        target.value = displayValue;
    }

    function handleFocus(): void {
        isFocused = true;
    }

    function handleBlur(e: Event): void {
        isFocused = false;
        const target = e.target as HTMLInputElement;

        // Baca nilai aktual dari DOM (bisa jadi user mengubah DOM
        // tanpa trigger input event, mis. autofill/DevTools),
        // lalu normalkan.
        const digitsOnly = target.value.replace(/\D/g, '');
        const num = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10);

        value = num;
        displayValue = formatRupiahInput(num);

        // Paksa sinkronisasi DOM.
        target.value = displayValue;
    }

    let inputId = $derived(id || name || undefined);
    let errorClass = $derived(
        error
            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
            : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white',
    );
</script>

<div>
    {#if label}
        <label
            for={inputId}
            class="block text-xs font-bold text-dark mb-1.5"
        >
            {label}
            {#if required}<span class="text-pink">*</span>{/if}
        </label>
    {/if}

    <div class="relative">
        <span
            class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-600 pointer-events-none"
        >
            Rp
        </span>

        <input
            id={inputId}
            name={name || undefined}
            type="text"
            inputmode="numeric"
            autocomplete="off"
            {placeholder}
            {required}
            {disabled}
            value={displayValue}
            oninput={handleInput}
            onfocus={handleFocus}
            onblur={handleBlur}
            class={[
                'w-full pl-12 pr-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all',
                errorClass,
                disabled ? 'opacity-60 cursor-not-allowed' : '',
            ].join(' ')}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
        />
    </div>

    {#if error}
        <p
            id={`${inputId}-error`}
            class="text-pink text-[11px] mt-1 font-bold"
            aria-live="polite"
        >
            {error}
        </p>
    {:else if hint}
        <p class="text-[11px] text-gray-500 mt-1">{hint}</p>
    {/if}
</div>