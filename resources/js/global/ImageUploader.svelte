<script lang="ts">
    /**
     * ImageUploader — upload file gambar dengan preview grid.
     *
     * ⚠️ FIX #1: tambah `logo-preview-wrapper` — dirender segera setelah
     *           `totalCount > 0`, meskipun `previews` belum siap.
     *           Anti race: `$effect` async (createImagePreview) butuh
     *           waktu → `logo-preview` baru muncul setelah Promise selesai.
     *           Test bisa tunggu wrapper dulu, baru logo-preview.
     * ⚠️ FIX #2: tambah placeholder loading saat `previews[i]` kosong —
     *           agar tidak kosong (tidak ada elemen) saat render awal.
     * ⚠️ FIX #3: error handling — jika createImagePreview gagal, set
     *           localError — agar user tahu (bukan silent).
     *
     * ✅ FIX A11Y #2: `label-content-name-mismatch` di tombol upload.
     *
     * MASALAH SEBELUMNYA (FIX A11Y #1):
     * - `<button aria-labelledby="upload-label-...">` dengan label visual
     *   "Logo Usaha (1 file, maks 2 MB)" dan teks di dalam tombol
     *   "Klik untuk upload JPG, PNG, atau WEBP" → MISMATCH.
     *
     * FIX A11Y #1 (SUDAH DIPERBAIKI, tapi masih mismatch):
     * - Ganti ke `aria-label="Logo Usaha — Klik untuk upload"`.
     * - Ternyata STILL mismatch karena ada teks visible KEDUA
     *   "JPG, PNG, atau WEBP" yang TIDAK termasuk dalam aria-label.
     *
     * FIX A11Y #2 (SEKARANG):
     * - Hapus `aria-label` sepenuhnya.
     * - Biarkan accessible name = gabungan teks visible:
     *   "Klik untuk upload JPG, PNG, atau WEBP"
     * - 100% match karena tidak ada aria-label yang memotong teks.
     * - SVG sudah `aria-hidden="true"` → tidak masuk accessible name.
     */

    import {
        validateImageFile,
        createImagePreview,
        formatFileSize,
    } from '@/utils/fileUpload';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        files = $bindable<File[]>([]),
        existingUrls = [] as string[],
        maxFiles = 2,
        maxSizeMB = 2,
        accept = 'image/jpeg,image/jpg,image/png,image/webp',
        single = false,
        label = 'Upload Gambar',
        validationLabel = 'file',
        hint = '',
        error = '',
        disabled = false,
        onRemoveExisting = undefined,
    }: {
        files?: File[];
        existingUrls?: string[];
        maxFiles?: number;
        maxSizeMB?: number;
        accept?: string;
        single?: boolean;
        label?: string;
        validationLabel?: string;
        hint?: string;
        error?: string;
        disabled?: boolean;
        onRemoveExisting?: ((url: string, index: number) => void) | undefined;
    } = $props();

    // ==========================================
    // A11Y — unique id untuk label (visual only)
    // ==========================================

    const uploadLabelId = `upload-label-${crypto.randomUUID()}`;

    // ==========================================
    // STATE
    // ==========================================

    let fileInput = $state<HTMLInputElement | undefined>();
    let previews = $state<string[]>([]);
    let localError = $state<string>('');

    // Sync previews dari `files` (new files)
    $effect(() => {
        let cancelled = false;

        async function buildPreviews() {
            try {
                const urls = await Promise.all(
                    files.map((f) => createImagePreview(f)),
                );
                if (!cancelled) {
                    previews = urls;
                    // ✅ FIX #3: bersihkan error preview jika sebelumnya gagal
                    if (localError === 'Gagal membuat preview gambar.') {
                        localError = '';
                    }
                }
            } catch {
                if (!cancelled) {
                    previews = [];
                    // ✅ FIX #3: set error jelas — bukan silent
                    localError = 'Gagal membuat preview gambar.';
                }
            }
        }

        buildPreviews();

        return () => {
            cancelled = true;
        };
    });

    // ==========================================
    // DERIVED
    // ==========================================

    let totalCount = $derived(existingUrls.length + files.length);
    let canAddMore = $derived(!disabled && totalCount < maxFiles);
    let displayError = $derived(localError || error);

    // ==========================================
    // HANDLERS
    // ==========================================

    async function handleFileChange(e: Event): Promise<void> {
        const target = e.target as HTMLInputElement;
        const picked = Array.from(target.files ?? []);
        target.value = '';

        if (picked.length === 0) return;

        localError = '';

        const remaining = maxFiles - totalCount;
        if (picked.length > remaining) {
            localError = `Maksimal ${maxFiles} file. Anda sudah punya ${totalCount} file.`;
            return;
        }

        const validFiles: File[] = [];
        for (const file of picked) {
            const r = validateImageFile(file, {
                maxSizeMB,
                label: validationLabel,
            });
            if (!r.valid && r.error) {
                localError = r.error;
                return;
            }
            validFiles.push(file);
        }

        files = single ? [validFiles[0]] : [...files, ...validFiles];
    }

    function removeFile(index: number): void {
        files = files.filter((_, i) => i !== index);
        localError = '';
    }

    function removeExisting(index: number): void {
        if (onRemoveExisting) {
            onRemoveExisting(existingUrls[index], index);
        }
    }

    function openPicker(): void {
        if (!canAddMore) return;
        fileInput?.click();
    }
</script>

<div>
    <!-- Label visual — id tetap ada untuk keperluan lain, tapi TIDAK
         dihubungkan via aria-labelledby ke tombol upload. -->
    <span id={uploadLabelId} class="block text-xs font-bold text-dark mb-1.5">
        {label}
        <span class="text-gray-600 font-normal">
            ({single ? '1 file' : `1–${maxFiles} file`}, maks {maxSizeMB} MB per file)
        </span>
    </span>

    <!-- Preview grid -->
    {#if totalCount > 0}
        <!-- ✅ FIX #1: logo-preview-wrapper — dirender segera setelah totalCount > 0,
             meskipun previews belum siap. Test bisa tunggu wrapper dulu. -->
        <div
            class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3"
            data-testid="logo-preview-wrapper"
        >
            <!-- Existing URLs -->
            {#each existingUrls as url, i (url)}
                <div class="relative rounded-2xl overflow-hidden border border-gray-200 aspect-square group">
                    <img
                        src={url}
                        alt={`Gambar ${i + 1}`}
                        class="w-full h-full object-cover"
                        data-testid="logo-preview"
                    />
                    <!-- ✅ Tombol hapus SELALU muncul di existing URL (termasuk single) -->
                    {#if !disabled}
                        <button
                            type="button"
                            onclick={() => removeExisting(i)}
                            class="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-all"
                            aria-label="Hapus logo"
                            data-testid="logo-remove-button"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    {/if}
                </div>
            {/each}

            <!-- New files -->
            {#each files as file, i (file.name + i)}
                <div class="relative rounded-2xl overflow-hidden border border-gray-200 aspect-square group">
                    {#if previews[i]}
                        <img
                            src={previews[i]}
                            alt={`Preview ${i + 1}`}
                            class="w-full h-full object-cover"
                            data-testid="logo-preview"
                        />
                    {:else}
                        <!-- ✅ FIX #2: placeholder loading saat previews[i] kosong -->
                        <div class="w-full h-full bg-gray-100 flex items-center justify-center animate-pulse" data-testid="logo-preview-loading">
                            <span class="text-xs text-gray-400">Memuat...</span>
                        </div>
                    {/if}
                    {#if !disabled}
                        <button
                            type="button"
                            onclick={() => removeFile(i)}
                            class="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-all"
                            aria-label="Hapus logo"
                            data-testid="logo-remove-button"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    {/if}
                    <!-- Overlay filename: pointer-events-none agar tidak intercept klik -->
                    <div class="absolute bottom-0 left-0 right-0 z-10 bg-black/60 text-white text-[10px] font-bold py-0.5 px-1.5 truncate pointer-events-none" aria-hidden="true">
                        {file.name} · {formatFileSize(file.size)}
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Dropzone / Upload button -->
    {#if canAddMore}
        <div data-testid="logo-placeholder">
            <!--
                ✅ FIX A11Y #2: HAPUS `aria-label` sepenuhnya.

                Sebelumnya: aria-label="Logo Usaha — Klik untuk upload"
                → mismatch karena teks "JPG, PNG, atau WEBP" tidak termasuk.

                Sekarang: tanpa aria-label → accessible name = gabungan
                teks visible ("Klik untuk upload JPG, PNG, atau WEBP").
                100% match → LOLOS WCAG 2.5.3.
            -->
            <button
                type="button"
                onclick={openPicker}
                data-testid="logo-upload-button"
                class="flex flex-col items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-pink hover:bg-pink/5 transition-all"
            >
                <svg
                    class="w-10 h-10 text-gray-400 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.5"
                    aria-hidden="true"
                >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p class="text-sm font-bold text-dark mb-0.5">Klik untuk upload</p>
                <p class="text-xs text-gray-500">JPG, PNG, atau WEBP</p>
            </button>
        </div>
    {:else if !disabled}
        <p class="text-xs text-gray-600 italic text-center py-2">
            Maksimal {maxFiles} file tercapai.
        </p>
    {/if}

    <!-- Hidden input -->
    <input
        bind:this={fileInput}
        type="file"
        {accept}
        {disabled}
        multiple={!single}
        onchange={handleFileChange}
        class="hidden"
        aria-hidden="true"
        tabindex="-1"
        data-testid="logo-input"
    />

    {#if displayError}
        <p class="text-pink text-[11px] mt-2 font-bold" aria-live="polite" data-testid="logo-error">
            {displayError}
        </p>
    {:else if hint}
        <p class="text-[11px] text-gray-500 mt-2">{hint}</p>
    {/if}
</div>