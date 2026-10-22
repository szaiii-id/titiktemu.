<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import BackButton from '@/global/BackButton.svelte';
    import { inertia, router } from '@inertiajs/svelte';
    import type {
        Package,
        PackageFacility,
    } from '@/types';
    import { formatCurrency } from '@/utils/formatCurrency';
    import { formatDurasi } from '@/utils/duration';
    import { todayInTimezone } from '@/utils/timezone';
    import { clientMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type PackageForBooking = Pick<
        Package,
        | 'id'
        | 'kode'
        | 'nama'
        | 'slug'
        | 'deskripsi'
        | 'kategori'
        | 'durasi_hari'
        | 'durasi_malam'
        | 'harga_per_orang'
        | 'harga_per_rombongan'
        | 'min_peserta'
        | 'max_peserta'
        | 'timezone'
    > & {
        facilities: PackageFacility[];
    };

    let { package: pkg }: { package: PackageForBooking } = $props();

    // ==========================================
    // STATE
    // ==========================================

    let step = $state<1 | 2>(1);

    let form = $state({
        tanggal_keberangkatan: '',
        jumlah_peserta: pkg.min_peserta,
        catatan: '',
    });

    let participants = $state<
        Array<{
            nama: string;
            umur: string | number;
            no_hp: string;
            catatan: string;
        }>
    >([]);

    let errors = $state<Record<string, string>>({});
    let processing = $state(false);

    // ==========================================
    // MIN DATE — H+3 BERDASARKAN TIMEZONE PACKAGE (PRD §9.6)
    // ==========================================

    function getMinDate(): string {
        const today = todayInTimezone(pkg.timezone);
        const date = new Date(today + 'T00:00:00');
        date.setDate(date.getDate() + 3);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    // ==========================================
    // SYNC PARTICIPANTS
    // ==========================================

    function syncParticipants() {
        const target = Number(form.jumlah_peserta);
        const current = participants.length;

        if (target > current) {
            for (let i = current; i < target; i++) {
                participants.push({
                    nama: '',
                    umur: '',
                    no_hp: '',
                    catatan: '',
                });
            }
        } else if (target < current) {
            participants = participants.slice(0, target);
        }
    }

    $effect(() => {
        syncParticipants();
    });

    // ==========================================
    // TOTAL HARGA
    // ==========================================

    let totalHarga = $derived.by(() => {
        const jumlah = Number(form.jumlah_peserta) || 0;
        const hargaRombongan = pkg.harga_per_rombongan
            ? parseFloat(pkg.harga_per_rombongan)
            : 0;

        if (hargaRombongan > 0) {
            return hargaRombongan;
        }

        const hargaPerOrang = parseFloat(pkg.harga_per_orang) || 0;
        return hargaPerOrang * jumlah;
    });

    // ==========================================
    // NAVIGATION
    // ==========================================

    function goToStep2() {
        const step1Errors: Record<string, string> = {};

        if (!form.tanggal_keberangkatan) {
            step1Errors.tanggal_keberangkatan =
                'Tanggal keberangkatan wajib diisi.';
        }

        const jumlah = Number(form.jumlah_peserta);
        if (jumlah < pkg.min_peserta) {
            step1Errors.jumlah_peserta = `Minimal ${pkg.min_peserta} orang.`;
        }
        if (jumlah > pkg.max_peserta) {
            step1Errors.jumlah_peserta = `Maksimal ${pkg.max_peserta} orang.`;
        }

        if (Object.keys(step1Errors).length > 0) {
            errors = step1Errors;
            return;
        }

        errors = {};
        step = 2;
    }

    function backToStep1() {
        step = 1;
        errors = {};
    }

    // ==========================================
    // SUBMIT
    // ==========================================

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        errors = {};

        const participantErrors: Record<string, string> = {};
        participants.forEach((p, idx) => {
            if (!p.nama || p.nama.trim().length < 2) {
                participantErrors[`participants.${idx}.nama`] =
                    'Nama peserta minimal 2 karakter.';
            }
        });

        if (Object.keys(participantErrors).length > 0) {
            errors = participantErrors;
            return;
        }

        processing = true;

        const payload = {
            tanggal_keberangkatan: form.tanggal_keberangkatan,
            jumlah_peserta: Number(form.jumlah_peserta),
            catatan: form.catatan || null,
            participants: participants.map((p) => ({
                nama: p.nama,
                umur: p.umur ? Number(p.umur) : null,
                no_hp: p.no_hp || null,
                catatan: p.catatan || null,
            })),
        };

        router.post(`/client/bookings/${pkg.id}`, payload, {
            onError: (err) => {
                errors = err as Record<string, string>;
                const step1Fields = [
                    'tanggal_keberangkatan',
                    'jumlah_peserta',
                ];
                if (
                    Object.keys(err).some((k) =>
                        step1Fields.includes(k),
                    )
                ) {
                    step = 1;
                }
                processing = false;
            },
            onFinish: () => {
                processing = false;
            },
        });
    }

    // ==========================================
    // HELPERS
    // ==========================================

    function formatTanggalIndo(tanggal: string): string {
        if (!tanggal) return '';
        const date = new Date(tanggal + 'T00:00:00');
        return new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(date);
    }

    let errorCount = $derived(Object.keys(errors).length);
</script>

<svelte:head>
    <title>Booking {pkg.nama} | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Form Booking" menuItems={clientMenu}>
    <BackButton
        href={`/client/catalog/${pkg.slug}`}
        label="Kembali ke Detail Paket"
    />

    <!-- Stepper -->
    <div class="max-w-3xl mx-auto mb-5">
        <div class="flex items-center gap-2 sm:gap-3">
            <!-- Step 1 -->
            <div class="flex items-center gap-2 shrink-0">
                <div
                    class="w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs transition-all {step ===
                    1
                        ? 'bg-pink-dark text-white shadow-md shadow-pink/30'
                        : 'bg-green text-white'}"
                >
                    {#if step > 1}
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
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    {:else}
                        1
                    {/if}
                </div>
                <span
                    class="text-xs sm:text-sm font-bold transition-colors {step ===
                    1
                        ? 'text-dark'
                        : 'text-gray-400'}"
                >
                    Info Booking
                </span>
            </div>

            <div
                class="flex-1 h-0.5 rounded-full transition-colors {step > 1
                    ? 'bg-green'
                    : 'bg-gray-200'}"
            ></div>

            <!-- Step 2 -->
            <div class="flex items-center gap-2 shrink-0">
                <div
                    class="w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs transition-all {step ===
                    2
                        ? 'bg-pink-dark text-white shadow-md shadow-pink/30'
                        : 'bg-gray-200 text-gray-500'}"
                >
                    2
                </div>
                <span
                    class="text-xs sm:text-sm font-bold transition-colors {step ===
                    2
                        ? 'text-dark'
                        : 'text-gray-400'}"
                >
                    Data Peserta
                </span>
            </div>
        </div>
    </div>

    <!-- Error Alert -->
    {#if errorCount > 0}
        <div
            class="max-w-3xl mx-auto mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-3"
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
                    Silakan periksa kembali data yang Anda masukkan.
                </p>
            </div>
        </div>
    {/if}

    <!-- ==========================================
         STEP 1: Info Booking
    ========================================== -->
    {#if step === 1}
        <div class="max-w-3xl mx-auto space-y-4">
            <!-- Paket Card -->
            <div
                class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5"
            >
                <div class="flex items-start gap-4">
                    <div
                        class="w-16 h-16 rounded-2xl bg-linear-to-br from-pink-dark to-purple flex items-center justify-center text-white font-extrabold text-xl shadow-md shrink-0"
                    >
                        {pkg.nama.charAt(0).toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h2
                            class="text-base font-extrabold text-dark mb-1 line-clamp-2"
                        >
                            {pkg.nama}
                        </h2>
                        <div
                            class="flex flex-wrap items-center gap-3 text-xs text-gray-500"
                        >
                            <span
                                >{formatDurasi(
                                    pkg.durasi_hari,
                                    pkg.durasi_malam,
                                )}</span
                            >
                            <span>•</span>
                            <span
                                >{formatCurrency(
                                    pkg.harga_per_orang,
                                )}/orang</span
                            >
                        </div>
                    </div>
                </div>
            </div>

            <!-- Form Card -->
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
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h3
                            class="text-base font-extrabold text-dark"
                        >
                            Info Booking
                        </h3>
                        <p class="text-xs text-gray-500">
                            Tentukan tanggal & jumlah peserta
                        </p>
                    </div>
                </div>

                <!-- ✅ FIX: novalidate — HTML5 min/max tidak block submit -->
                <form
                    novalidate
                    onsubmit={(e) => {
                        e.preventDefault();
                        goToStep2();
                    }}
                >
                    <div class="p-5 sm:p-6 space-y-5">
                        <!-- Tanggal keberangkatan -->
                        <div>
                            <label
                                for="tanggal_keberangkatan"
                                class="block text-xs font-bold text-dark mb-1.5"
                            >
                                Tanggal Keberangkatan
                                <span class="text-pink">*</span>
                            </label>
                            <input
                                id="tanggal_keberangkatan"
                                type="date"
                                bind:value={
                                    form.tanggal_keberangkatan
                                }
                                min={getMinDate()}
                                required
                                class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:outline-none transition-all
                                    {errors.tanggal_keberangkatan
                                    ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                    : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                            />
                            {#if errors.tanggal_keberangkatan}
                                <p
                                    class="text-pink text-[11px] mt-1 font-bold"
                                >
                                    {errors.tanggal_keberangkatan}
                                </p>
                            {:else}
                                <p
                                    class="text-[11px] text-gray-500 mt-1"
                                >
                                    Minimal H+3 dari hari ini.
                                    Tanggal paling awal:
                                    <strong
                                        >{formatTanggalIndo(
                                            getMinDate(),
                                        )}</strong
                                    >
                                </p>
                            {/if}
                        </div>

                        <!-- Jumlah peserta -->
                        <div>
                            <label
                                for="jumlah_peserta"
                                class="block text-xs font-bold text-dark mb-1.5"
                            >
                                Jumlah Peserta
                                <span class="text-pink">*</span>
                            </label>
                            <input
                                id="jumlah_peserta"
                                type="number"
                                bind:value={form.jumlah_peserta}
                                min={pkg.min_peserta}
                                max={pkg.max_peserta}
                                required
                                class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:outline-none transition-all
                                    {errors.jumlah_peserta
                                    ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                    : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                            />
                            {#if errors.jumlah_peserta}
                                <p
                                    class="text-pink text-[11px] mt-1 font-bold"
                                >
                                    {errors.jumlah_peserta}
                                </p>
                            {:else}
                                <p
                                    class="text-[11px] text-gray-500 mt-1"
                                >
                                    Min. {pkg.min_peserta} – Maks.
                                    {pkg.max_peserta} orang
                                </p>
                            {/if}
                        </div>

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
                                bind:value={form.catatan}
                                rows="3"
                                placeholder="Alergi, permintaan khusus, atau catatan tambahan..."
                                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all resize-none"
                            ></textarea>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div
                        class="p-4 sm:p-5 bg-gray-50/50 flex flex-col-reverse sm:flex-row gap-2"
                    >
                        <a
                            href={`/client/catalog/${pkg.slug}`}
                            use:inertia
                            class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all"
                        >
                            Batal
                        </a>
                        <button
                            type="submit"
                            class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md"
                        >
                            Lanjut Isi Peserta
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
                                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                                />
                            </svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- ==========================================
         STEP 2: Data Peserta + Konfirmasi
    ========================================== -->
    {#if step === 2}
        <div class="max-w-3xl mx-auto space-y-4">
            <!-- Ringkasan -->
            <div
                class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5"
            >
                <h3
                    class="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-3"
                >
                    Ringkasan Booking
                </h3>
                <div
                    class="grid grid-cols-2 sm:grid-cols-3 gap-4"
                >
                    <div>
                        <p
                            class="text-[10px] text-gray-500 uppercase tracking-widest"
                        >
                            Paket
                        </p>
                        <p
                            class="text-sm font-bold text-dark line-clamp-1"
                        >
                            {pkg.nama}
                        </p>
                    </div>
                    <div>
                        <p
                            class="text-[10px] text-gray-500 uppercase tracking-widest"
                        >
                            Tanggal
                        </p>
                        <p class="text-sm font-bold text-dark">
                            {formatTanggalIndo(
                                form.tanggal_keberangkatan,
                            )}
                        </p>
                    </div>
                    <div>
                        <p
                            class="text-[10px] text-gray-500 uppercase tracking-widest"
                        >
                            Jumlah Peserta
                        </p>
                        <p class="text-sm font-bold text-dark">
                            {form.jumlah_peserta} orang
                        </p>
                    </div>
                </div>
            </div>

            <!-- Form Peserta -->
            <div
                class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
            >
                <div
                    class="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap"
                >
                    <div class="flex items-center gap-3">
                        <div
                            class="w-10 h-10 rounded-2xl bg-blue/10 text-blue flex items-center justify-center shrink-0"
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
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h3
                                class="text-base font-extrabold text-dark"
                            >
                                Data Peserta
                            </h3>
                            <p class="text-xs text-gray-500">
                                Isi data {form.jumlah_peserta} peserta
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onclick={backToStep1}
                        class="text-xs font-bold text-gray-500 hover:text-pink-text transition-colors whitespace-nowrap"
                    >
                        Ubah Info Booking
                    </button>
                </div>

                <!-- ✅ FIX: novalidate — HTML5 required tidak block submit -->
                <form novalidate onsubmit={handleSubmit}>
                    <div class="p-5 sm:p-6 space-y-4">
                        {#each participants as participant, index}
                            <div
                                class="border border-gray-200 rounded-2xl overflow-hidden"
                            >
                                <div
                                    class="bg-gray-50/80 px-4 py-2.5 flex items-center justify-between"
                                >
                                    <div
                                        class="flex items-center gap-2"
                                    >
                                        <div
                                            class="w-7 h-7 rounded-lg bg-pink-dark text-white flex items-center justify-center font-extrabold text-xs"
                                        >
                                            {index + 1}
                                        </div>
                                        <span
                                            class="text-xs font-extrabold text-dark"
                                            >Peserta {index +
                                                1}</span
                                        >
                                    </div>
                                </div>
                                <div class="p-4 space-y-3">
                                    <!-- Nama -->
                                    <div>
                                        <label
                                            for={`nama_${index}`}
                                            class="block text-xs font-bold text-dark mb-1.5"
                                        >
                                            Nama
                                            <span class="text-pink"
                                                >*</span
                                            >
                                        </label>
                                        <input
                                            id={`nama_${index}`}
                                            type="text"
                                            bind:value={
                                                participant.nama
                                            }
                                            required
                                            placeholder="Nama lengkap peserta"
                                            class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none transition-all
                                                {errors[
                                                `participants.${index}.nama`
                                            ]
                                                ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100 focus:border-red-500'
                                                : 'border-gray-200 focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white'}"
                                        />
                                        {#if errors[`participants.${index}.nama`]}
                                            <p
                                                class="text-pink text-[11px] mt-1 font-bold"
                                            >
                                                {errors[
                                                    `participants.${index}.nama`
                                                ]}
                                            </p>
                                        {/if}
                                    </div>

                                    <!-- Umur & No HP -->
                                    <div
                                        class="grid grid-cols-2 gap-3"
                                    >
                                        <div>
                                            <label
                                                for={`umur_${index}`}
                                                class="block text-xs font-bold text-dark mb-1.5"
                                            >
                                                Umur
                                                <span
                                                    class="text-gray-600 font-normal"
                                                    >(opsional)</span
                                                >
                                            </label>
                                            <input
                                                id={`umur_${index}`}
                                                type="number"
                                                bind:value={
                                                    participant.umur
                                                }
                                                min="1"
                                                max="120"
                                                placeholder="Contoh: 30"
                                                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                for={`no_hp_${index}`}
                                                class="block text-xs font-bold text-dark mb-1.5"
                                            >
                                                No. HP
                                                <span
                                                    class="text-gray-600 font-normal"
                                                    >(opsional)</span
                                                >
                                            </label>
                                            <input
                                                id={`no_hp_${index}`}
                                                type="text"
                                                bind:value={
                                                    participant.no_hp
                                                }
                                                placeholder="081234567890"
                                                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                            />
                                        </div>
                                    </div>

                                    <!-- Catatan -->
                                    <div>
                                        <label
                                            for={`catatan_peserta_${index}`}
                                            class="block text-xs font-bold text-dark mb-1.5"
                                        >
                                            Catatan
                                            <span
                                                class="text-gray-600 font-normal"
                                                >(opsional)</span
                                            >
                                        </label>
                                        <input
                                            id={`catatan_peserta_${index}`}
                                            type="text"
                                            bind:value={
                                                participant.catatan
                                            }
                                            placeholder="Contoh: Alergi seafood"
                                            class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink/10 focus:border-pink focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>

                    <!-- Total Harga -->
                    <div
                        class="p-5 sm:p-6 border-t border-gray-100 bg-linear-to-r from-pink-dark/5 to-purple/5"
                    >
                        <div
                            class="flex items-center justify-between mb-1"
                        >
                            <span
                                class="text-sm font-bold text-gray-600"
                            >
                                Total Harga
                                {#if pkg.harga_per_rombongan && parseFloat(pkg.harga_per_rombongan) > 0}
                                    <span
                                        class="text-[11px] text-gray-500"
                                        >(harga rombongan)</span
                                    >
                                {:else}
                                    <span
                                        class="text-[11px] text-gray-500"
                                        >({form.jumlah_peserta} ×
                                        {formatCurrency(
                                            pkg.harga_per_orang,
                                        )})</span
                                    >
                                {/if}
                            </span>
                            <span
                                class="text-2xl font-extrabold text-pink-text"
                            >
                                {formatCurrency(totalHarga)}
                            </span>
                        </div>
                        <p class="text-[11px] text-gray-500">
                            Pembayaran manual via transfer bank.
                            Setelah booking dibuat, Anda akan
                            mendapat instruksi pembayaran.
                        </p>
                    </div>

                    <!-- Actions -->
                    <div
                        class="p-4 sm:p-5 bg-gray-50/50 flex flex-col-reverse sm:flex-row gap-2"
                    >
                        <button
                            type="button"
                            onclick={backToStep1}
                            class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all"
                        >
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
                                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                />
                            </svg>
                            Kembali
                        </button>
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
                                Membuat Booking...
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
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                Konfirmasi Booking
                            {/if}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}
</DashboardLayout>