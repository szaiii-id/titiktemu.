<script lang="ts">
    /**
     * SearchInput — input pencarian dengan icon & tombol clear.
     *
     * ✅ FIX: Pakai `bind:value` (bukan `{value}`) — 2-way binding.
     * Alasan:
     * - `{value}` (1-way) → Svelte set `input.value` saat render,
     *   TAPI tidak handle sync balik saat user type. Bisa reset
     *   input.value → state tidak sinkron → `router.get` pakai
     *   value lama / kosong.
     * - `bind:value` (2-way) → Svelte handle sync `input.value`
     *   ↔ `value` prop, termasuk saat user type cepat.
     *
     * @example
     *   <SearchInput bind:value={search} oninput={handleSearch} placeholder="Cari..." />
     */

    // ==========================================
    // PROPS
    // ==========================================

    let {
        value = $bindable(''),
        placeholder = 'Cari...',
        oninput = undefined,
        onclear = undefined,
        autofocus = false,
    }: {
        value?: string;
        placeholder?: string;
        oninput?: ((value: string) => void) | undefined;
        onclear?: (() => void) | undefined;
        autofocus?: boolean;
    } = $props();

    // ==========================================
    // STATE
    // ==========================================

    let isFocused = $state(false);
    let inputEl: HTMLInputElement;

    // ==========================================
    // EFFECT — autofocus tanpa atribut HTML
    // ==========================================

    $effect(() => {
        if (autofocus && inputEl) {
            inputEl.focus();
        }
    });

    // ==========================================
    // HANDLERS
    // ==========================================

    function handleClear(): void {
        value = '';
        oninput?.('');
        onclear?.();
    }
</script>

<div class="relative">
    <div
        class="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors {isFocused
            ? 'text-pink-text'
            : 'text-gray-400'}"
        aria-hidden="true"
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
        </svg>
    </div>

    <!--
        ✅ FIX: bind:value (2-way) — Svelte handle sync otomatis.
        Hapus `oninput={handleInput}` — sudah tidak perlu, `bind:value`
        yang update `value`. Cukup panggil callback `oninput` untuk
        parent (mis. `handleSearch` di Catalog).
    -->
    <input
        bind:this={inputEl}
        type="text"
        bind:value
        {placeholder}
        oninput={() => oninput?.(value)}
        onfocus={() => (isFocused = true)}
        onblur={() => (isFocused = false)}
        class="w-full pl-11 pr-10 py-3 border rounded-2xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
            {isFocused
            ? 'border-pink bg-white ring-4 ring-pink/10 shadow-sm'
            : 'border-gray-200 hover:border-gray-300'}"
    />

    {#if value}
        <button
            type="button"
            onclick={handleClear}
            class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 hover:bg-pink-dark hover:text-white text-gray-500 flex items-center justify-center transition-all"
            aria-label="Hapus pencarian"
        >
            <svg
                class="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="3"
                aria-hidden="true"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                />
            </svg>
        </button>
    {/if}
</div>