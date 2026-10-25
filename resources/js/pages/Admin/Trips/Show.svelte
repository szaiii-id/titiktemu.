<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import BackButton from '@/global/BackButton.svelte';
    import ConfirmModal from '@/global/ConfirmModal.svelte';
    import FormModal from '@/global/FormModal.svelte';
    import RupiahInput from '@/global/RupiahInput.svelte';
    import { inertia, router } from '@inertiajs/svelte';
    import type {
        DailyReport,
        Package,
        Trip,
        TripDay,
        TripHonorTipe,
        TripMitra,
        TripMitraRole,
        TripStatus,
        UserMini,
    } from '@/types';
    import {
        dailyReportStatusBadge,
        dailyReportStatusLabel,
        tripMitraRoleBadge,
        tripMitraRoleLabel,
        tripStatusBadge,
        tripStatusLabel,
    } from '@/utils/enums';
    import { formatCurrency } from '@/utils/formatCurrency';
    import { formatDate, formatDateTime } from '@/utils/formatDate';
    import {
        formatDurasiFromRange,
        hitungDurasiHari,
    } from '@/utils/duration';
    import { parseRupiah } from '@/utils/form';
    import { timezoneLabelLong } from '@/utils/timezone';
    import { adminMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type TripDetail = Omit<Trip, 'package' | 'booking' | 'mitras' | 'days'> & {
        package:
            | Pick<
                  Package,
                  'id' | 'nama' | 'kode' | 'slug' | 'timezone' | 'cover_image'
              >
            | null;
        booking:
            | {
                  id: number;
                  kode: string;
                  tanggal_keberangkatan: string;
                  jumlah_peserta: number;
                  total_harga: string;
                  status: string;
                  client: Pick<
                      UserMini,
                      'id' | 'name' | 'email' | 'username'
                  > | null;
              }
            | null;
        mitras: Array<
            Omit<TripMitra, 'mitra' | 'assigner'> & {
                mitra:
                    | (Pick<UserMini, 'id' | 'name' | 'email' | 'username'> & {
                          timezone: string;
                      })
                    | null;
                assigner: Pick<
                    UserMini,
                    'id' | 'name' | 'email'
                > | null;
            }
        >;
        days: Array<
            TripDay & {
                daily_reports: Array<
                    DailyReport & {
                        mitra: Pick<
                            UserMini,
                            'id' | 'name' | 'email' | 'username'
                        > | null;
                        verifier: Pick<
                            UserMini,
                            'id' | 'name' | 'email'
                        > | null;
                        media: Array<{
                            id: number;
                            path: string;
                            urutan: number;
                        }>;
                    }
                >;
            }
        >;
    };

    let {
        trip,
        totalHonor,
        unverifiedDays = [],
        submittedReports = [],
        canComplete = false,
        allMitras = [],
    }: {
        trip: TripDetail;
        totalHonor: number;
        unverifiedDays: Array<{
            id: number;
            hari_ke: number;
            tanggal: string;
            judul: string;
        }>;
        submittedReports: Array<{
            id: number;
            catatan: string | null;
            status: string;
            submitted_at: string;
            mitra: Pick<UserMini, 'id' | 'name' | 'email'> | null;
            media: Array<{ id: number; path: string; urutan: number }>;
            trip_day: {
                id: number;
                hari_ke: number;
                tanggal: string;
                judul: string;
            } | null;
        }>;
        canComplete: boolean;
        allMitras: Array<Pick<UserMini, 'id' | 'name' | 'email' | 'username'>>;
    } = $props();

    // ==========================================
    // DERIVED
    // ==========================================

    let isActive = $derived(trip.status === 'active');
    let isCompleted = $derived(trip.status === 'completed');
    let isCancelled = $derived(trip.status === 'cancelled');
    let canActivate = $derived(trip.status === 'scheduled');
    let canCancel = $derived(!isCompleted && !isCancelled);
    let canAssignMitra = $derived(!isCompleted && !isCancelled);
    let hasMitra = $derived(trip.mitras.length > 0);

    let snapshot = $derived(trip.snapshot_package || {});
    let snapshotFacilities = $derived(
        (snapshot.facilities as {
            include?: string[];
            exclude?: string[];
        }) || { include: [], exclude: [] },
    );

    let totalReports = $derived(
        trip.days.reduce(
            (sum, d) => sum + (d.daily_reports?.length ?? 0),
            0,
        ),
    );

    let pendingVerifyCount = $derived(
        trip.days.reduce(
            (sum, d) =>
                sum +
                (d.daily_reports?.filter(
                    (r) => r.status === 'submitted',
                ).length ?? 0),
            0,
        ),
    );

    let verifiedDaysCount = $derived(
        trip.days.filter((d) =>
            (d.daily_reports ?? []).some(
                (r) => r.status === 'verified',
            ),
        ).length,
    );

    // ==========================================
    // MODAL — ACTIVATE
    // ==========================================

    let showActivateModal = $state(false);
    let activateProcessing = $state(false);

    function activateTrip() {
        activateProcessing = true;
        router.post(
            `/admin/trips/${trip.id}/activate`,
            {},
            {
                onFinish: () => {
                    activateProcessing = false;
                    showActivateModal = false;
                },
            },
        );
    }

    // ==========================================
    // MODAL — COMPLETE
    // ==========================================

    let showCompleteModal = $state(false);
    let completeProcessing = $state(false);

    function completeTrip() {
        completeProcessing = true;
        router.post(
            `/admin/trips/${trip.id}/complete`,
            {},
            {
                onFinish: () => {
                    completeProcessing = false;
                    showCompleteModal = false;
                },
            },
        );
    }

    // ==========================================
    // MODAL — CANCEL
    // ==========================================

    let showCancelModal = $state(false);
    let cancelAlasan = $state('');
    let cancelErrors = $state<Record<string, string>>({});
    let cancelProcessing = $state(false);

    function openCancelModal() {
        cancelAlasan = '';
        cancelErrors = {};
        showCancelModal = true;
    }

    function submitCancel() {
        cancelProcessing = true;
        cancelErrors = {};
        router.post(
            `/admin/trips/${trip.id}/cancel`,
            { alasan: cancelAlasan },
            {
                onError: (err) => {
                    cancelErrors = err as Record<string, string>;
                    cancelProcessing = false;
                },
                onSuccess: () => {
                    showCancelModal = false;
                    cancelProcessing = false;
                },
                onFinish: () => {
                    cancelProcessing = false;
                },
            },
        );
    }

    // ==========================================
    // MODAL — ASSIGN MITRA
    // ==========================================

    let showAssignModal = $state(false);
    let editingTripMitra = $state<TripDetail['mitras'][0] | null>(null);
    let assignForm = $state({
        mitra_id: 0 as number,
        role: 'lead' as TripMitraRole,
        honor: 0 as number,
        honor_tipe: 'flat' as TripHonorTipe,
        instruksi: '',
    });
    let assignErrors = $state<Record<string, string>>({});
    let assignProcessing = $state(false);

    // Dropdown lokal
    let isDropdownMitraOpen = $state(false);
    let mitraSearchQuery = $state('');

    // ✅ FIX: `mitraDropdownRef` pakai $state agar reaktif
    let mitraDropdownRef = $state<HTMLDivElement | null>(null);
    // ✅ FIX: Ref untuk input search di dropdown (auto-focus tanpa `autofocus`)
    let mitraSearchInputEl = $state<HTMLInputElement | null>(null);

    let filteredMitras = $derived(
        allMitras.filter(
            (m) =>
                m.name
                    .toLowerCase()
                    .includes(mitraSearchQuery.toLowerCase()) ||
                m.email
                    .toLowerCase()
                    .includes(mitraSearchQuery.toLowerCase()),
        ),
    );

    let selectedMitraLabel = $derived(
        allMitras.find((m) => m.id === assignForm.mitra_id)?.name ??
            'Pilih mitra...',
    );

    // ✅ FIX: Auto-focus input search saat dropdown terbuka (tanpa `autofocus`)
    $effect(() => {
        if (isDropdownMitraOpen && mitraSearchInputEl) {
            requestAnimationFrame(() => mitraSearchInputEl?.focus());
        }
    });

    function selectMitra(id: number) {
        assignForm.mitra_id = id;
        isDropdownMitraOpen = false;
        mitraSearchQuery = '';
    }

    $effect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                mitraDropdownRef &&
                !mitraDropdownRef.contains(event.target as Node)
            ) {
                isDropdownMitraOpen = false;
            }
        }
        if (isDropdownMitraOpen) {
            document.addEventListener('click', handleClickOutside);
            return () =>
                document.removeEventListener(
                    'click',
                    handleClickOutside,
                );
        }
    });

    function openAssignModal() {
        editingTripMitra = null;
        assignForm = {
            mitra_id: 0,
            role: 'lead',
            honor: 0,
            honor_tipe: 'flat',
            instruksi: '',
        };
        isDropdownMitraOpen = false;
        mitraSearchQuery = '';
        assignErrors = {};
        showAssignModal = true;
    }

    function openEditModal(tm: TripDetail['mitras'][0]) {
        editingTripMitra = tm;
        assignForm = {
            mitra_id: tm.mitra?.id ?? 0,
            role: tm.role,
            honor: parseRupiah(tm.honor),
            honor_tipe: tm.honor_tipe,
            instruksi: tm.instruksi ?? '',
        };
        isDropdownMitraOpen = false;
        mitraSearchQuery = '';
        assignErrors = {};
        showAssignModal = true;
    }

    function submitAssign() {
        assignErrors = {};
        assignProcessing = true;

        const payload = {
            role: assignForm.role,
            honor: assignForm.honor,
            honor_tipe: assignForm.honor_tipe,
            instruksi: assignForm.instruksi || null,
        };

        if (editingTripMitra) {
            router.put(
                `/admin/trips/${trip.id}/mitras/${editingTripMitra.id}`,
                payload,
                {
                    onError: (err) => {
                        assignErrors = err as Record<string, string>;
                        assignProcessing = false;
                    },
                    onSuccess: () => {
                        showAssignModal = false;
                        assignProcessing = false;
                    },
                    onFinish: () => {
                        assignProcessing = false;
                    },
                },
            );
        } else {
            router.post(
                `/admin/trips/${trip.id}/assign-mitra`,
                { ...payload, mitra_id: assignForm.mitra_id },
                {
                    onError: (err) => {
                        assignErrors = err as Record<string, string>;
                        assignProcessing = false;
                    },
                    onSuccess: () => {
                        showAssignModal = false;
                        assignProcessing = false;
                    },
                    onFinish: () => {
                        assignProcessing = false;
                    },
                },
            );
        }
    }

    // ==========================================
    // MODAL — UNASSIGN
    // ==========================================

    let tripMitraToUnassign = $state<TripDetail['mitras'][0] | null>(
        null,
    );
    let unassignProcessing = $state(false);

    function confirmUnassign(tm: TripDetail['mitras'][0]) {
        tripMitraToUnassign = tm;
    }

    function unassignMitra() {
        if (!tripMitraToUnassign) return;
        unassignProcessing = true;
        router.delete(
            `/admin/trips/${trip.id}/mitras/${tripMitraToUnassign.id}`,
            {
                onFinish: () => {
                    unassignProcessing = false;
                    tripMitraToUnassign = null;
                },
            },
        );
    }

    // ==========================================
    // MODAL — VERIFY/REJECT REPORT
    // ==========================================

    let reportToVerify = $state<TripDetail['days'][0]['daily_reports'][0] | null>(
        null,
    );
    let verifyReportProcessing = $state(false);

    function openVerifyReportModal(
        report: TripDetail['days'][0]['daily_reports'][0],
    ) {
        reportToVerify = report;
    }

    function confirmVerifyReport() {
        if (!reportToVerify) return;
        verifyReportProcessing = true;
        router.post(
            `/admin/daily-reports/${reportToVerify.id}/verify`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    verifyReportProcessing = false;
                    reportToVerify = null;
                },
            },
        );
    }

    let reportToReject = $state<TripDetail['days'][0]['daily_reports'][0] | null>(
        null,
    );
    let rejectReason = $state('');
    let rejectErrors = $state<Record<string, string>>({});
    let rejectProcessing = $state(false);

    function openRejectReportModal(
        report: TripDetail['days'][0]['daily_reports'][0],
    ) {
        reportToReject = report;
        rejectReason = '';
        rejectErrors = {};
    }

    function confirmRejectReport() {
        if (!reportToReject) return;
        rejectProcessing = true;
        rejectErrors = {};
        router.post(
            `/admin/daily-reports/${reportToReject.id}/reject`,
            { reason: rejectReason },
            {
                preserveScroll: true,
                onError: (err) => {
                    rejectErrors = err as Record<string, string>;
                    rejectProcessing = false;
                },
                onSuccess: () => {
                    reportToReject = null;
                    rejectProcessing = false;
                },
                onFinish: () => {
                    rejectProcessing = false;
                },
            },
        );
    }

    // ==========================================
    // MODAL — VIEW PHOTO
    // ==========================================

    let photoToView = $state<string | null>(null);
    let photoDialogEl = $state<HTMLDivElement | null>(null);

    function openPhotoModal(path: string) {
        photoToView = `/storage/${path}`;
        // ✅ FIX: Fokus ke dialog setelah render
        requestAnimationFrame(() => photoDialogEl?.focus());
    }

    function closePhotoModal() {
        photoToView = null;
    }

    function handlePhotoKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            closePhotoModal();
        }
    }
</script>

<svelte:head>
    <title>Trip {trip.kode} | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Detail Trip" menuItems={adminMenu}>
    <BackButton href="/admin/trips" label="Kembali ke Daftar Trip" />

    <!-- ==========================================
         HEADER
    ========================================== -->
    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6 mb-6"
    >
        <div class="flex flex-col lg:flex-row gap-5">
            <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-2">
                    <span
                        class="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold {tripStatusBadge(
                            trip.status,
                        )}"
                    >
                        {tripStatusLabel(trip.status)}
                    </span>
                    <span class="text-xs font-mono text-gray-500"
                        >{trip.kode}</span
                    >
                </div>

                <h1 class="text-2xl font-extrabold text-dark mb-1">
                    {(snapshot.nama as string) ??
                        trip.package?.nama ??
                        'Trip'}
                </h1>

                <div
                    class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4"
                >
                    <div>
                        <p
                            class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest"
                        >
                            Mulai
                        </p>
                        <p class="text-sm font-bold text-dark">
                            {formatDate(trip.tanggal_mulai)}
                        </p>
                    </div>
                    <div>
                        <p
                            class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest"
                        >
                            Selesai
                        </p>
                        <p class="text-sm font-bold text-dark">
                            {formatDate(trip.tanggal_selesai)}
                        </p>
                    </div>
                    <div>
                        <p
                            class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest"
                        >
                            Peserta
                        </p>
                        <p class="text-sm font-bold text-dark">
                            {trip.jumlah_peserta} orang
                        </p>
                    </div>
                    <div>
                        <p
                            class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest"
                        >
                            Timezone
                        </p>
                        <p class="text-sm font-bold text-dark">
                            {timezoneLabelLong(trip.timezone)}
                        </p>
                    </div>
                </div>

                <!-- Progress -->
                {#if isActive || isCompleted}
                    <div
                        class="mt-4 pt-4 border-t border-gray-100"
                    >
                        <div
                            class="flex items-center justify-between mb-2"
                        >
                            <span
                                class="text-xs font-bold text-gray-600"
                                >Progress Verifikasi</span
                            >
                            <span
                                class="text-xs font-bold text-dark"
                            >
                                {verifiedDaysCount} / {trip.days
                                    .length} hari
                            </span>
                        </div>
                        <div
                            class="h-2 bg-gray-100 rounded-full overflow-hidden"
                        >
                            <div
                                class="h-full bg-gradient-to-r from-green-dark to-green transition-all"
                                style="width: {trip.days.length > 0
                                    ? (verifiedDaysCount /
                                          trip.days.length) *
                                      100
                                    : 0}%"
                            ></div>
                        </div>
                        {#if pendingVerifyCount > 0}
                            <p
                                class="text-[11px] text-sun-text mt-1 font-bold"
                            >
                                {pendingVerifyCount} laporan menunggu
                                verifikasi
                            </p>
                        {/if}
                    </div>
                {/if}
            </div>

            <!-- Actions -->
            <div
                class="flex flex-col gap-2 lg:w-48 flex-shrink-0"
            >
                {#if canActivate}
                    <button
                        type="button"
                        onclick={() => (showActivateModal = true)}
                        disabled={!hasMitra}
                        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-purple text-white font-bold text-sm hover:bg-purple-dark transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        Aktifkan Trip
                    </button>
                {/if}

                {#if isActive}
                    <button
                        type="button"
                        onclick={() => (showCompleteModal = true)}
                        disabled={!canComplete}
                        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-green-dark text-white font-bold text-sm hover:bg-green transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                        Selesaikan
                    </button>
                {/if}

                {#if canCancel}
                    <button
                        type="button"
                        onclick={openCancelModal}
                        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-red-50 text-red-700 font-bold text-sm hover:bg-red-100 transition-all"
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
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                        Batalkan
                    </button>
                {/if}

                 <a
                    href={`/admin/trips/${trip.id}/manifest`}
                    target="_blank"
                    class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md"
                >
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                        />
                    </svg>
                    Cetak Laporan
                </a>

                {#if trip.booking}
                    <a
                        href={`/admin/bookings/${trip.booking.id}`}
                        use:inertia
                        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all"
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
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                        </svg>
                        Lihat Booking
                    </a>
                {/if}
            </div>
        </div>

        {#if canActivate && !hasMitra}
            <div
                class="mt-4 p-3 bg-sun/10 border border-sun/20 rounded-2xl flex items-start gap-3"
            >
                <svg
                    class="w-5 h-5 text-sun-text flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
                <p class="text-xs text-sun-text font-bold">
                    Trip ini belum punya mitra. Assign minimal 1
                    mitra sebelum mengaktifkan trip.
                </p>
            </div>
        {/if}

        {#if isActive && !canComplete}
            <div
                class="mt-4 p-3 bg-sun/10 border border-sun/20 rounded-2xl flex items-start gap-3"
            >
                <svg
                    class="w-5 h-5 text-sun-text flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
                <div class="text-xs text-sun-text">
                    <p class="font-bold mb-0.5">
                        Trip belum bisa diselesaikan
                    </p>
                    <p class="opacity-90">
                        Hari berikut belum punya laporan
                        terverifikasi:
                        {unverifiedDays
                            .map((d) => `Hari ${d.hari_ke}`)
                            .join(', ')}
                    </p>
                </div>
            </div>
        {/if}
    </div>

    <!-- ==========================================
         MAIN LAYOUT
    ========================================== -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Kolom kiri -->
        <div class="lg:col-span-2 space-y-6">
            <!-- ==========================================
                 MITRA
            ========================================== -->
            <div
                class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
            >
                <div
                    class="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap"
                >
                    <div class="flex items-center gap-3">
                        <div
                            class="w-10 h-10 rounded-2xl bg-pink/10 text-pink-text flex items-center justify-center flex-shrink-0"
                        >
                            <svg
                                class="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2
                                class="text-base font-extrabold text-dark"
                            >
                                Mitra
                            </h2>
                            <p class="text-xs text-gray-500">
                                {trip.mitras.length} mitra di-assign
                            </p>
                        </div>
                    </div>
                    {#if canAssignMitra}
                        <button
                            type="button"
                            onclick={openAssignModal}
                            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md"
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
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                            Assign Mitra
                        </button>
                    {/if}
                </div>

                <div class="p-5 sm:p-6">
                    {#if trip.mitras.length === 0}
                        <div class="text-center py-8">
                            <div
                                class="w-16 h-16 mx-auto rounded-2xl bg-sun/10 flex items-center justify-center mb-3"
                            >
                                <svg
                                    class="w-8 h-8 text-sun-text"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <p
                                class="text-sm font-bold text-dark mb-1"
                            >
                                Belum ada mitra
                            </p>
                            <p class="text-xs text-gray-500 mb-4">
                                Trip harus punya minimal 1 mitra
                                sebelum diaktifkan.
                            </p>
                            {#if canAssignMitra}
                                <button
                                    type="button"
                                    onclick={openAssignModal}
                                    class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md"
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
                                            d="M12 4v16m8-8H4"
                                        />
                                    </svg>
                                    Assign Mitra Pertama
                                </button>
                            {/if}
                        </div>
                    {:else}
                        <div class="space-y-3">
                            {#each trip.mitras as tm (tm.id)}
                                <div
                                    class="border border-gray-200 rounded-2xl p-4"
                                >
                                    <div
                                        class="flex items-start gap-3 flex-wrap"
                                    >
                                        <div
                                            class="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-dark to-purple flex items-center justify-center text-white font-extrabold shadow-md flex-shrink-0"
                                        >
                                            {tm.mitra?.name
                                                ?.charAt(0)
                                                ?.toUpperCase() ?? '?'}
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <div
                                                class="flex items-center gap-2 flex-wrap mb-1"
                                            >
                                                <p
                                                    class="font-bold text-dark truncate"
                                                >
                                                    {tm.mitra?.name ??
                                                        'Mitra dihapus'}
                                                </p>
                                                <span
                                                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold {tripMitraRoleBadge(
                                                        tm.role,
                                                    )}"
                                                >
                                                    {tripMitraRoleLabel(
                                                        tm.role,
                                                    )}
                                                </span>
                                            </div>
                                            <p
                                                class="text-xs text-gray-500 truncate"
                                            >
                                                {tm.mitra?.email ?? '-'}
                                            </p>

                                            <div
                                                class="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100"
                                            >
                                                <div>
                                                    <p
                                                        class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest"
                                                    >
                                                        Honor
                                                    </p>
                                                    <p
                                                        class="text-sm font-bold text-dark"
                                                    >
                                                        {formatCurrency(
                                                            tm.honor,
                                                        )}
                                                    </p>
                                                    <p
                                                        class="text-[10px] text-gray-500"
                                                    >
                                                        {tm.honor_tipe ===
                                                        'flat'
                                                            ? 'Flat (Total)'
                                                            : 'Per Hari'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p
                                                        class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest"
                                                    >
                                                        Total
                                                    </p>
                                                    <p
                                                        class="text-sm font-extrabold text-green-text"
                                                    >
                                                        {formatCurrency(
                                                            tm.honor_tipe ===
                                                                'flat'
                                                                ? parseRupiah(
                                                                      tm.honor,
                                                                  )
                                                                : parseRupiah(
                                                                      tm.honor,
                                                                  ) *
                                                                      hitungDurasiHari(
                                                                          trip.tanggal_mulai,
                                                                          trip.tanggal_selesai,
                                                                      ),
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {#if tm.instruksi}
                                                <div
                                                    class="mt-3 p-3 bg-blue/5 border border-blue/20 rounded-xl"
                                                >
                                                    <p
                                                        class="text-[10px] font-extrabold text-blue-text uppercase tracking-widest mb-1"
                                                    >
                                                        Instruksi
                                                    </p>
                                                    <p
                                                        class="text-xs text-blue-text whitespace-pre-line"
                                                    >
                                                        {tm.instruksi}
                                                    </p>
                                                </div>
                                            {/if}
                                        </div>

                                        {#if canAssignMitra}
                                            <div
                                                class="flex gap-1.5 flex-shrink-0"
                                            >
                                                <button
                                                    type="button"
                                                    onclick={() =>
                                                        openEditModal(
                                                            tm,
                                                        )}
                                                    class="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-blue bg-blue/5 hover:bg-blue/10 transition-all"
                                                    aria-label="Edit mitra"
                                                >
                                                    <svg
                                                        class="w-3.5 h-3.5"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        stroke-width="2.5"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                        />
                                                    </svg>
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onclick={() =>
                                                        confirmUnassign(
                                                            tm,
                                                        )}
                                                    class="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 transition-all"
                                                    aria-label="Unassign mitra"
                                                >
                                                    <svg
                                                        class="w-3.5 h-3.5"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        stroke-width="2.5"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>
                                                </button>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>

                        <div
                            class="mt-5 p-4 bg-gradient-to-r from-green/5 to-green/10 border border-green/20 rounded-2xl"
                        >
                            <div
                                class="flex items-center justify-between"
                            >
                                <span
                                    class="text-sm font-bold text-green-text"
                                    >Total Honor Semua Mitra</span
                                >
                                <span
                                    class="text-xl font-extrabold text-green-text"
                                    >{formatCurrency(
                                        totalHonor,
                                    )}</span
                                >
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- ==========================================
                 ITINERARY + REPORTS
            ========================================== -->
            <div
                class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
            >
                <div
                    class="p-5 sm:p-6 border-b border-gray-100 flex items-center gap-3"
                >
                    <div
                        class="w-10 h-10 rounded-2xl bg-blue/10 text-blue flex items-center justify-center flex-shrink-0"
                    >
                        <svg
                            class="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-base font-extrabold text-dark">
                            Itinerary & Laporan
                        </h2>
                        <p class="text-xs text-gray-500">
                            {trip.days.length} hari — {totalReports} laporan
                        </p>
                    </div>
                </div>

                <div class="p-5 sm:p-6">
                    {#if trip.days.length === 0}
                        <p
                            class="text-sm text-gray-500 italic text-center py-8"
                        >
                            Itinerary belum tersedia.
                        </p>
                    {:else}
                        <div class="space-y-4">
                            {#each trip.days as day (day.id)}
                                <div class="relative pl-8">
                                    <div
                                        class="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 {day.hari_ke ===
                                        1
                                            ? 'top-3'
                                            : ''} {day.hari_ke ===
                                        trip.days.length
                                            ? 'bottom-[calc(100%-1rem)]'
                                            : ''}"
                                    ></div>

                                    <div
                                        class="absolute left-0 top-0 w-6 h-6 rounded-full bg-pink-dark text-white flex items-center justify-center font-extrabold text-[10px] shadow-md"
                                    >
                                        {day.hari_ke}
                                    </div>

                                    <div class="pb-4">
                                        <div
                                            class="flex items-center gap-2 flex-wrap mb-1"
                                        >
                                            <h3
                                                class="text-sm font-extrabold text-dark"
                                            >
                                                {day.judul}
                                            </h3>
                                            <span
                                                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold {day.status ===
                                                'pending'
                                                    ? 'bg-gray-100 text-gray-700 border border-gray-200'
                                                    : day.status ===
                                                        'in_progress'
                                                      ? 'bg-purple/10 text-purple-text border border-purple/20'
                                                      : 'bg-green/10 text-green-text border border-green/20'}"
                                            >
                                                {day.status === 'pending'
                                                    ? 'Belum Dimulai'
                                                    : day.status ===
                                                        'in_progress'
                                                      ? 'Sedang Berjalan'
                                                      : 'Selesai'}
                                            </span>
                                        </div>

                                        <p
                                            class="text-xs text-gray-500 mb-2"
                                        >
                                            {formatDate(day.tanggal)}
                                        </p>

                                        {#if day.deskripsi}
                                            <p
                                                class="text-sm text-gray-600 leading-relaxed mb-3"
                                            >
                                                {day.deskripsi}
                                            </p>
                                        {/if}

                                        {#if day.daily_reports && day.daily_reports.length > 0}
                                            <div
                                                class="space-y-2 mt-3 pl-3 border-l-2 border-pink/20"
                                            >
                                                {#each day.daily_reports as report (report.id)}
                                                    <div
                                                        class="bg-gray-50/70 rounded-xl p-3"
                                                    >
                                                        <div
                                                            class="flex items-start gap-3 flex-wrap"
                                                        >
                                                            {#if report.media && report.media.length > 0}
                                                                <div
                                                                    class="flex gap-1.5 flex-shrink-0"
                                                                >
                                                                    {#each report.media.slice(0, 2) as media (media.id)}
                                                                        <button
                                                                            type="button"
                                                                            onclick={() =>
                                                                                openPhotoModal(
                                                                                    media.path,
                                                                                )}
                                                                            class="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-pink transition-all"
                                                                            aria-label="Lihat foto bukti"
                                                                        >
                                                                            <img
                                                                                src={`/storage/${media.path}`}
                                                                                alt="Bukti"
                                                                                class="w-full h-full object-cover"
                                                                            />
                                                                        </button>
                                                                    {/each}
                                                                </div>
                                                            {/if}

                                                            <div
                                                                class="flex-1 min-w-0"
                                                            >
                                                                <div
                                                                    class="flex flex-wrap items-center gap-2 mb-1"
                                                                >
                                                                    <span
                                                                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold {dailyReportStatusBadge(
                                                                            report.status,
                                                                        )}"
                                                                    >
                                                                        {dailyReportStatusLabel(
                                                                            report.status,
                                                                        )}
                                                                    </span>
                                                                    <span
                                                                        class="text-[11px] text-gray-500"
                                                                    >
                                                                        {report
                                                                            .mitra
                                                                            ?.name ??
                                                                            '-'}
                                                                    </span>
                                                                    <span class="text-[10px] text-gray-600">
                                                                        {formatDateTime(report.submitted_at)}
                                                                    </span>
                                                                </div>
                                                                {#if report.catatan}
                                                                    <p
                                                                        class="text-xs text-gray-600 line-clamp-2"
                                                                    >
                                                                        {report.catatan}
                                                                    </p>
                                                                {/if}
                                                                {#if report.status === 'rejected' && report.rejection_reason}
                                                                    <p
                                                                        class="text-[11px] text-red-700 mt-1"
                                                                    >
                                                                        <strong
                                                                            >Ditolak:</strong
                                                                        >
                                                                        {report.rejection_reason}
                                                                    </p>
                                                                {/if}
                                                            </div>

                                                            {#if report.status === 'submitted'}
                                                                <div
                                                                    class="flex gap-1.5 flex-shrink-0"
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onclick={() =>
                                                                            openVerifyReportModal(
                                                                                report,
                                                                            )}
                                                                        class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white bg-green-800 hover:bg-green transition-all"
                                                                    >
                                                                        <svg
                                                                            class="w-3 h-3"
                                                                            fill="none"
                                                                            viewBox="0 0 24 24"
                                                                            stroke="currentColor"
                                                                            stroke-width="2.5"
                                                                        >
                                                                            <path
                                                                                stroke-linecap="round"
                                                                                stroke-linejoin="round"
                                                                                d="M5 13l4 4L19 7"
                                                                            />
                                                                        </svg>
                                                                        Verifikasi
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onclick={() =>
                                                                            openRejectReportModal(
                                                                                report,
                                                                            )}
                                                                        class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 transition-all"
                                                                    >
                                                                        <svg
                                                                            class="w-3 h-3"
                                                                            fill="none"
                                                                            viewBox="0 0 24 24"
                                                                            stroke="currentColor"
                                                                            stroke-width="2.5"
                                                                        >
                                                                            <path
                                                                                stroke-linecap="round"
                                                                                stroke-linejoin="round"
                                                                                d="M6 18L18 6M6 6l12 12"
                                                                            />
                                                                        </svg>
                                                                        Tolak
                                                                    </button>
                                                                </div>
                                                            {/if}
                                                        </div>
                                                    </div>
                                                {/each}
                                            </div>
                                        {:else}
                                            <p
                                                class="text-xs text-gray-600 italic mt-2"
                                            >
                                                Belum ada laporan untuk
                                                hari ini.
                                            </p>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Fasilitas -->
            {#if (snapshotFacilities.include?.length ?? 0) > 0 || (snapshotFacilities.exclude?.length ?? 0) > 0}
                <div
                    class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
                >
                    <div
                        class="p-5 sm:p-6 border-b border-gray-100 flex items-center gap-3"
                    >
                        <div
                            class="w-10 h-10 rounded-2xl bg-green/10 text-green-text flex items-center justify-center flex-shrink-0"
                        >
                            <svg
                                class="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2
                                class="text-base font-extrabold text-dark"
                            >
                                Fasilitas
                            </h2>
                            <p class="text-xs text-gray-500">
                                Dari snapshot package
                            </p>
                        </div>
                    </div>

                    <div
                        class="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5"
                    >
                        <div>
                            <div
                                class="flex items-center gap-2 mb-3"
                            >
                                <div
                                    class="w-6 h-6 rounded-lg bg-green-dark text-white flex items-center justify-center flex-shrink-0"
                                >
                                    <svg
                                        class="w-3.5 h-3.5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        stroke-width="3"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </div>
                                <h3
                                    class="text-xs font-extrabold text-green-text uppercase tracking-widest"
                                >
                                    Termasuk
                                </h3>
                            </div>
                            <ul class="space-y-2">
                                {#each snapshotFacilities.include ?? [] as nama}
                                    <li
                                        class="flex items-start gap-2 text-sm text-gray-700"
                                    >
                                        <svg
                                            class="w-4 h-4 text-green-text flex-shrink-0 mt-0.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            stroke-width="2.5"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                        <span>{nama}</span>
                                    </li>
                                {/each}
                            </ul>
                        </div>

                        <div>
                            <div
                                class="flex items-center gap-2 mb-3"
                            >
                                <div
                                    class="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center flex-shrink-0"
                                >
                                    <svg
                                        class="w-3.5 h-3.5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        stroke-width="3"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </div>
                                <h3
                                    class="text-xs font-extrabold text-red-700 uppercase tracking-widest"
                                >
                                    Tidak Termasuk
                                </h3>
                            </div>
                            <ul class="space-y-2">
                                {#each snapshotFacilities.exclude ?? [] as nama}
                                    <li
                                        class="flex items-start gap-2 text-sm text-gray-700"
                                    >
                                        <svg
                                            class="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            stroke-width="2.5"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                        <span>{nama}</span>
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Kolom kanan -->
        <div class="lg:col-span-1">
            <div class="lg:sticky lg:top-24 space-y-4">
                {#if trip.booking}
                    <div
                        class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5"
                    >
                        <h3
                            class="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-3"
                        >
                            Dari Booking
                        </h3>
                        <div
                            class="flex items-start gap-3 mb-4"
                        >
                            <div
                                class="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-dark to-purple flex items-center justify-center text-white font-extrabold text-sm shadow-md flex-shrink-0"
                            >
                                {trip.booking.client?.name
                                    ?.charAt(0)
                                    ?.toUpperCase() ?? '?'}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p
                                    class="text-sm font-extrabold text-dark truncate"
                                >
                                    {trip.booking.client?.name ??
                                        'Client'}
                                </p>
                                <p
                                    class="text-[11px] text-gray-500 truncate"
                                >
                                    {trip.booking.client?.email ?? '-'}
                                </p>
                            </div>
                        </div>

                        <dl class="space-y-2 text-xs">
                            <div class="flex justify-between gap-3">
                                <dt class="text-gray-500">
                                    Kode Booking
                                </dt>
                                <dd
                                    class="font-mono font-bold text-dark text-right"
                                >
                                    {trip.booking.kode}
                                </dd>
                            </div>
                            <div class="flex justify-between gap-3">
                                <dt class="text-gray-500">
                                    Total Harga
                                </dt>
                                <dd
                                    class="font-bold text-dark text-right"
                                >
                                    {formatCurrency(
                                        trip.booking.total_harga,
                                    )}
                                </dd>
                            </div>
                        </dl>

                        <a
                            href={`/admin/bookings/${trip.booking.id}`}
                            use:inertia
                            class="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-xs hover:bg-gray-50 transition-all"
                        >
                            Lihat Detail Booking
                        </a>
                    </div>
                {/if}

                {#if trip.package}
                    <div
                        class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5"
                    >
                        <h3
                            class="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-3"
                        >
                            Paket
                        </h3>
                        <a
                            href={`/admin/packages/${trip.package.id}`}
                            use:inertia
                            class="flex items-start gap-3 group"
                        >
                            <div
                                class="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-dark to-purple flex items-center justify-center text-white font-extrabold text-sm shadow-md flex-shrink-0"
                            >
                                {trip.package.nama
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p
                                    class="text-sm font-extrabold text-dark group-hover:text-pink-text transition-colors line-clamp-2"
                                >
                                    {trip.package.nama}
                                </p>
                                <p
                                    class="text-[11px] text-gray-500 font-mono mt-0.5"
                                >
                                    {trip.package.kode}
                                </p>
                            </div>
                        </a>
                    </div>
                {/if}

                <div
                    class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5"
                >
                    <h3
                        class="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-3"
                    >
                        Info Trip
                    </h3>
                    <dl class="space-y-3 text-sm">
                        <div class="flex justify-between gap-3">
                            <dt class="text-gray-500">Kode</dt>
                            <dd
                                class="font-mono font-bold text-dark text-right"
                            >
                                {trip.kode}
                            </dd>
                        </div>
                        <div class="flex justify-between gap-3">
                            <dt class="text-gray-500">Durasi</dt>
                            <dd
                                class="font-bold text-dark text-right"
                            >
                                {formatDurasiFromRange(
                                    trip.tanggal_mulai,
                                    trip.tanggal_selesai,
                                )}
                            </dd>
                        </div>
                        <div class="flex justify-between gap-3">
                            <dt class="text-gray-500">Status</dt>
                            <dd class="text-right">
                                <span
                                    class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold {tripStatusBadge(
                                        trip.status,
                                    )}"
                                >
                                    {tripStatusLabel(trip.status)}
                                </span>
                            </dd>
                        </div>
                    </dl>
                </div>

                <div
                    class="bg-blue/5 border border-blue/20 rounded-3xl p-5"
                >
                    <div class="flex items-start gap-3">
                        <svg
                            class="w-5 h-5 text-blue flex-shrink-0 mt-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <div>
                            <p
                                class="text-xs font-extrabold text-blue-text mb-1"
                            >
                                Alur Trip
                            </p>
                            <ol
                                class="text-[11px] text-blue-text/80 space-y-0.5 list-decimal list-inside"
                            >
                                <li>Assign minimal 1 mitra</li>
                                <li>
                                    Aktifkan trip saat tanggal mulai
                                    tiba
                                </li>
                                <li>
                                    Mitra lapor harian (foto bukti)
                                </li>
                                <li>Verifikasi laporan mitra</li>
                                <li>
                                    Selesaikan trip setelah semua
                                    hari terverifikasi
                                </li>
                                <li>
                                    Honor masuk ke wallet (Fase 5)
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</DashboardLayout>

<!-- ==========================================
     MODALS
========================================== -->

<ConfirmModal
    bind:open={showActivateModal}
    variant="info"
    title="Aktifkan Trip?"
    description="Trip akan berstatus 'Sedang Berjalan'. Mitra bisa mulai lapor harian."
    confirmLabel="Ya, Aktifkan"
    processing={activateProcessing}
    onConfirm={activateTrip}
/>

<ConfirmModal
    bind:open={showCompleteModal}
    variant="success"
    title="Selesaikan Trip?"
    description="Trip akan berstatus 'Selesai'. Semua hari sudah terverifikasi. Honor mitra akan dicatat (credit di Fase 5)."
    confirmLabel="Ya, Selesaikan"
    processing={completeProcessing}
    onConfirm={completeTrip}
/>

<ConfirmModal
    bind:open={showCancelModal}
    variant="danger"
    title="Batalkan Trip?"
    description={`Trip ${trip.kode} akan dibatalkan.`}
    confirmLabel="Ya, Batalkan"
    requiresReason
    reasonLabel="Alasan"
    reasonPlaceholder="Contoh: Cuaca buruk, trip ditunda"
    bind:reasonValue={cancelAlasan}
    reasonError={cancelErrors.alasan}
    processing={cancelProcessing}
    onConfirm={submitCancel}
/>

<!-- Assign Mitra -->
<FormModal
    bind:open={showAssignModal}
    title={editingTripMitra ? 'Edit Assignment' : 'Assign Mitra'}
    submitLabel={editingTripMitra ? 'Simpan' : 'Assign'}
    processing={assignProcessing}
    onSubmit={submitAssign}
>
    {#snippet children()}
        {#if !editingTripMitra}
            <div bind:this={mitraDropdownRef} class="relative">
                <!-- ✅ FIX #2: Ganti <label> → <span> dengan id (a11y) -->
                <span id="assign-mitra-label" class="block text-xs font-bold text-dark mb-1.5">
                    Mitra <span class="text-pink">*</span>
                </span>

                <button
                    type="button"
                    onclick={() =>
                        (isDropdownMitraOpen = !isDropdownMitraOpen)}
                    aria-labelledby="assign-mitra-label"
                    aria-expanded={isDropdownMitraOpen}
                    class="w-full flex items-center justify-between gap-2 px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium text-left focus:outline-none transition-all
                        {assignErrors.mitra_id
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 focus:border-pink focus:bg-white'}"
                >
                    <span
                        class={assignForm.mitra_id
                            ? 'text-dark font-bold'
                            : 'text-gray-400'}
                    >
                        {selectedMitraLabel}
                    </span>
                    <svg
                        class="w-4 h-4 text-gray-400 transition-transform {isDropdownMitraOpen
                            ? 'rotate-180'
                            : ''}"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2.5"
                        aria-hidden="true"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>

                {#if isDropdownMitraOpen}
                    <div
                        class="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-hidden"
                    >
                        <div class="p-2 border-b border-gray-100">
                            <!-- ✅ FIX #3: Hapus `autofocus` → pakai bind:this + $effect -->
                            <input
                                bind:this={mitraSearchInputEl}
                                type="text"
                                bind:value={mitraSearchQuery}
                                placeholder="Cari nama atau email..."
                                class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-xs focus:outline-none focus:border-pink focus:bg-white"
                            />
                        </div>
                        <ul class="max-h-52 overflow-y-auto">
                            {#if filteredMitras.length === 0}
                                <li
                                    class="px-4 py-3 text-xs text-gray-500 italic text-center"
                                >
                                    Tidak ada mitra ditemukan
                                </li>
                            {:else}
                                {#each filteredMitras as mitra (mitra.id)}
                                    <li>
                                        <button
                                            type="button"
                                            onclick={() =>
                                                selectMitra(mitra.id)}
                                            class="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors
                                                {assignForm.mitra_id ===
                                                mitra.id
                                                    ? 'bg-pink/5'
                                                    : ''}"
                                        >
                                            <div
                                                class="flex items-center justify-between gap-2"
                                            >
                                                <div class="min-w-0">
                                                    <p
                                                        class="text-sm font-bold text-dark truncate"
                                                    >
                                                        {mitra.name}
                                                    </p>
                                                    <p
                                                        class="text-[11px] text-gray-500 truncate"
                                                    >
                                                        {mitra.email}
                                                    </p>
                                                </div>
                                                {#if assignForm.mitra_id === mitra.id}
                                                    <svg
                                                        class="w-4 h-4 text-pink-text flex-shrink-0"
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
                                                {/if}
                                            </div>
                                        </button>
                                    </li>
                                {/each}
                            {/if}
                        </ul>
                    </div>
                {/if}

                {#if assignErrors.mitra_id}
                    <p class="text-pink text-[11px] mt-1 font-bold">
                        {assignErrors.mitra_id}
                    </p>
                {/if}
            </div>
        {:else}
            <div class="p-3 bg-gray-50 rounded-xl">
                <p
                    class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1"
                >
                    Mitra
                </p>
                <p class="text-sm font-bold text-dark">
                    {editingTripMitra.mitra?.name ?? 'Mitra'}
                </p>
            </div>
        {/if}

        <div class="grid grid-cols-2 gap-3">
            <div>
                <label
                    for="assign_role"
                    class="block text-xs font-bold text-dark mb-1.5"
                >
                    Role
                </label>
                <select
                    id="assign_role"
                    bind:value={assignForm.role}
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all cursor-pointer"
                >
                    <option value="lead">Lead</option>
                    <option value="asisten">Asisten</option>
                </select>
            </div>
            <div>
                <label
                    for="assign_honor_tipe"
                    class="block text-xs font-bold text-dark mb-1.5"
                >
                    Tipe Honor
                </label>
                <select
                    id="assign_honor_tipe"
                    bind:value={assignForm.honor_tipe}
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all cursor-pointer"
                >
                    <option value="flat">Flat</option>
                    <option value="per_hari">Per Hari</option>
                </select>
            </div>
        </div>

        <RupiahInput
            label="Honor"
            required
            bind:value={assignForm.honor}
            error={assignErrors.honor}
            placeholder="500000"
        />

        <div>
            <label
                for="assign_instruksi"
                class="block text-xs font-bold text-dark mb-1.5"
            >
                Instruksi
                <span class="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
                id="assign_instruksi"
                bind:value={assignForm.instruksi}
                rows="3"
                placeholder="Instruksi khusus untuk mitra..."
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all resize-none"
            ></textarea>
        </div>
    {/snippet}
</FormModal>

<!-- Unassign -->
<ConfirmModal
    open={tripMitraToUnassign !== null}
    variant="danger"
    title="Unassign Mitra?"
    description={`${tripMitraToUnassign?.mitra?.name ?? ''} akan dihapus dari trip ini.`}
    confirmLabel="Ya, Unassign"
    processing={unassignProcessing}
    onConfirm={unassignMitra}
    onCancel={() => (tripMitraToUnassign = null)}
/>

<!-- Verify Report -->
<ConfirmModal
    open={reportToVerify !== null}
    variant="success"
    title="Verifikasi Laporan?"
    description={`Laporan dari ${reportToVerify?.mitra?.name ?? '-'} akan diverifikasi.`}
    confirmLabel="Ya, Verifikasi"
    processing={verifyReportProcessing}
    onConfirm={confirmVerifyReport}
    onCancel={() => (reportToVerify = null)}
/>

<!-- Reject Report -->
<ConfirmModal
    open={reportToReject !== null}
    variant="danger"
    title="Tolak Laporan?"
    description={`Laporan dari ${reportToReject?.mitra?.name ?? '-'} akan ditolak.`}
    confirmLabel="Ya, Tolak"
    requiresReason
    reasonLabel="Alasan"
    reasonPlaceholder="Contoh: Foto kurang jelas"
    bind:reasonValue={rejectReason}
    reasonError={rejectErrors.reason}
    processing={rejectProcessing}
    onConfirm={confirmRejectReport}
    onCancel={() => (reportToReject = null)}
/>

<!-- ==========================================
     MODAL: VIEW PHOTO
     ✅ FIX #4-7: a11y (role=dialog, tabindex, keyboard, hapus img onclick)
========================================== -->
{#if photoToView}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
    >
        <!-- Overlay button fullscreen → close -->
        <button
            type="button"
            class="absolute inset-0 cursor-default"
            aria-label="Tutup pratinjau foto"
            onclick={closePhotoModal}
        ></button>

        <!-- Dialog konten -->
        <div
            bind:this={photoDialogEl}
            role="dialog"
            aria-modal="true"
            aria-label="Pratinjau foto bukti"
            tabindex="-1"
            onkeydown={handlePhotoKeydown}
            class="relative max-w-full max-h-full focus:outline-none"
        >
            <button
                type="button"
                onclick={closePhotoModal}
                class="absolute -top-2 -right-2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                aria-label="Tutup"
            >
                <svg
                    class="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                    aria-hidden="true"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>

            <img
                src={photoToView}
                alt="Foto bukti"
                class="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
        </div>
    </div>
{/if}