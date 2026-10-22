<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import BackButton from '@/global/BackButton.svelte';
    import ImageUploader from '@/global/ImageUploader.svelte';
    import { inertia, router } from '@inertiajs/svelte';
    import type {
        DailyReport,
        Package,
        Trip,
        TripDay,
    } from '@/types';
    import { formatDate } from '@/utils/formatDate';
    import { mitraMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type TripForReport = Pick<
        Trip,
        | 'id'
        | 'kode'
        | 'tanggal_mulai'
        | 'tanggal_selesai'
        | 'timezone'
        | 'status'
        | 'snapshot_package'
    > & {
        package: Pick<Package, 'id' | 'nama' | 'kode' | 'timezone'> | null;
        days: Array<Pick<TripDay, 'id' | 'hari_ke' | 'tanggal' | 'judul' | 'status'>>;
    };

    type TripDayForReport = Pick<
        TripDay,
        'id' | 'hari_ke' | 'tanggal' | 'judul' | 'deskripsi' | 'status'
    >;

    type ExistingReport = Pick<
        DailyReport,
        'id' | 'catatan' | 'status' | 'rejection_reason' | 'submitted_at'
    > & {
        media: Array<{
            id: number;
            path: string;
            urutan: number;
        }>;
    };

    let {
        trip,
        tripDay,
        existingReport,
    }: {
        trip: TripForReport;
        tripDay: TripDayForReport;
        existingReport: ExistingReport | null;
    } = $props();

    // ==========================================
    // STATE
    // ==========================================

    // Catatan — di-init dari props `existingReport` (initial value).
    // Setelah submit → router.post → Inertia reload → komponen re-mount
    // → state re-init. Jadi tidak perlu sync via $effect.
    // svelte-ignore state_referenced_locally
    let catatan = $state(existingReport?.catatan ?? '');

    // Files baru (yang diupload di form ini)
    let newFiles = $state<File[]>([]);

    // Preview URL — initial dari existing, atau kosong
    let initialPreviews = $derived(
        existingReport?.media?.map((m) => `/storage/${m.path}`) ?? [],
    );

    let errors = $state<Record<string, string>>({});
    let processing = $state(false);

    let errorCount = $derived(Object.keys(errors).length);

    // Deteksi resubmit
    let isResubmit = $derived(
        existingReport !== null && existingReport.status === 'rejected',
    );

    // ==========================================
    // SUBMIT
    // ==========================================

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        errors = {};

        // Validasi client-side
        const existingCount = isResubmit
            ? 0
            : (existingReport?.media?.length ?? 0);
        const totalMedia = existingCount + newFiles.length;

        if (totalMedia < 1) {
            errors = { media: 'Minimal 1 foto bukti wajib diupload.' };
            return;
        }

        if (totalMedia > 2) {
            errors = { media: 'Maksimal 2 foto bukti.' };
            return;
        }

        processing = true;

        const formData = new FormData();
        formData.append('catatan', catatan || '');

        newFiles.forEach((file, index) => {
            formData.append(`media[${index}]`, file);
        });

        router.post(
            `/mitra/trips/${trip.id}/days/${tripDay.id}/report`,
            formData,
            {
                forceFormData: true,
                onError: (err) => {
                    errors = err as Record<string, string>;
                    processing = false;
                },
                onFinish: () => {
                    processing = false;
                },
            },
        );
    }
</script>

<svelte:head>
    <title>Laporan Hari {tripDay.hari_ke} | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Lapor Harian" menuItems={mitraMenu}>
    <BackButton
        href={`/mitra/trips/${trip.id}`}
        label="Kembali ke Trip"
    />

    <div class="max-w-2xl mx-auto space-y-4">
        <!-- Info Trip -->
        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5"
        >
            <div class="flex items-start gap-3">
                <div
                    class="w-12 h-12 rounded-2xl bg-linear-to-br from-pink-dark to-purple flex items-center justify-center text-white font-extrabold text-lg shadow-md shrink-0"
                >
                    {trip.package?.nama?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div class="flex-1 min-w-0">
                    <p
                        class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-0.5"
                    >
                        {trip.kode}
                    </p>
                    <h1
                        class="text-base font-extrabold text-dark truncate"
                    >
                        {trip.package?.nama ?? 'Trip'}
                    </h1>
                    <p class="text-xs text-gray-500 mt-0.5">
                        Hari {tripDay.hari_ke} — {tripDay.judul}
                    </p>
                    <p class="text-[11px] text-gray-500 mt-1">
                        {formatDate(tripDay.tanggal)}
                    </p>
                </div>
            </div>
        </div>

        <!-- Resubmit Banner -->
        {#if isResubmit && existingReport?.rejection_reason}
            <div
                class="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-3"
            >
                <svg
                    class="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clip-rule="evenodd"
                    />
                </svg>
                <div>
                    <p class="text-sm text-red-700 font-bold">
                        Laporan Ditolak
                    </p>
                    <p class="text-xs text-red-600 mt-0.5">
                        {existingReport.rejection_reason}
                    </p>
                    <p class="text-xs text-red-600 mt-2 font-bold">
                        Mohon upload ulang foto bukti yang lebih jelas.
                    </p>
                </div>
            </div>
        {/if}

        <!-- Error Alert -->
        {#if errorCount > 0}
            <div
                class="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-3"
            >
                <svg
                    class="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clip-rule="evenodd"
                    />
                </svg>
                <div>
                    <p class="text-sm text-red-700 font-bold">
                        Terdapat {errorCount} kesalahan pada form
                    </p>
                    <p class="text-xs text-red-600 mt-0.5">
                        Silakan periksa kembali.
                    </p>
                </div>
            </div>
        {/if}

        <!-- Form -->
        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
        >
            <div
                class="p-5 sm:p-6 border-b border-gray-100 flex items-center gap-3"
            >
                <div
                    class="w-10 h-10 rounded-2xl bg-pink/10 text-pink-text flex items-center justify-center shrink-0"
                >
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                </div>
                <div>
                    <h2 class="text-base font-extrabold text-dark">
                        {isResubmit
                            ? 'Upload Ulang Laporan'
                            : 'Laporan Harian'}
                    </h2>
                    <p class="text-xs text-gray-500">
                        Upload 1-2 foto bukti kegiatan hari ini
                    </p>
                </div>
            </div>

            <form onsubmit={handleSubmit}>
                <div class="p-5 sm:p-6 space-y-5">
                    <!-- Foto Bukti -->
                    <ImageUploader
                        bind:files={newFiles}
                        existingUrls={isResubmit ? [] : initialPreviews}
                        maxFiles={2}
                        maxSizeMB={2}
                        label="Foto Bukti"
                        hint="Pastikan foto menunjukkan kegiatan hari ini dengan jelas."
                        error={errors.media}
                    />

                    <!-- Catatan -->
                    <div>
                        <label
                            for="catatan"
                            class="block text-xs font-bold text-dark mb-1.5"
                        >
                            Catatan
                            <span class="text-gray-600 font-normal"
                                >(opsional)</span
                            >
                        </label>
                        <textarea
                            id="catatan"
                            bind:value={catatan}
                            rows="4"
                            placeholder="Ceritakan singkat kegiatan hari ini, kendala, atau hal penting lainnya..."
                            class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all resize-none
                                {errors.catatan
                                ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                        ></textarea>
                        {#if errors.catatan}
                            <p
                                class="text-pink text-[11px] mt-1 font-bold"
                            >
                                {errors.catatan}
                            </p>
                        {/if}
                    </div>
                </div>

                <!-- Actions -->
                <div
                    class="p-4 sm:p-5 bg-gray-50/50 flex flex-col-reverse sm:flex-row gap-2"
                >
                    <a
                        href={`/mitra/trips/${trip.id}`}
                        use:inertia
                        class="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all"
                    >
                        Batal
                    </a>
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
                                aria-hidden="true"
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
                            Mengirim...
                        {:else}
                            <svg
                                class="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2.5"
                                aria-hidden="true"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                />
                            </svg>
                            Kirim Laporan
                        {/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
</DashboardLayout>