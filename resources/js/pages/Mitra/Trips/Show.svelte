<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import BackButton from '@/global/BackButton.svelte';
    import { inertia } from '@inertiajs/svelte';
    import type {
        DailyReport,
        Package,
        Trip,
        TripDay,
        TripHonorTipe,
        TripMitra,
        TripMitraRole,
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
        hitungDurasiHari,
    } from '@/utils/duration';
    import { parseRupiah } from '@/utils/form';
    import { isTodayInTimezone, timezoneLabelLong } from '@/utils/timezone';
    import { mitraMenu } from '@/utils/menus';

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
                  client: Pick<
                      UserMini,
                      'id' | 'name' | 'email'
                  > | null;
              }
            | null;
        mitras: Array<
            Omit<TripMitra, 'mitra'> & {
                mitra:
                    | Pick<
                          UserMini,
                          'id' | 'name' | 'email' | 'username'
                      >
                    | null;
            }
        >;
        days: Array<
            TripDay & {
                daily_reports: Array<
                    Omit<DailyReport, 'media'> & {
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

    type TripMitraAssignment = {
        id: number;
        role: TripMitraRole;
        honor: string;
        honor_tipe: TripHonorTipe;
        instruksi: string | null;
    };

    let {
        trip,
        tripMitra,
    }: {
        trip: TripDetail;
        tripMitra: TripMitraAssignment | null;
    } = $props();

    // ==========================================
    // DERIVED
    // ==========================================

    let isActive = $derived(trip.status === 'active');

    let snapshot = $derived(trip.snapshot_package || {});
    let snapshotFacilities = $derived(
        (snapshot.facilities as {
            include?: string[];
            exclude?: string[];
        }) || { include: [], exclude: [] },
    );

    // ==========================================
    // HELPERS — TIMEZONE AWARE (PRD §9.6)
    // ==========================================

    function isTripDayToday(day: TripDay): boolean {
        return isTodayInTimezone(day.tanggal, trip.timezone);
    }

    function canReport(day: TripDetail['days'][0]): boolean {
        if (!isActive) return false;
        if (!isTripDayToday(day)) return false;

        if (!day.daily_reports || day.daily_reports.length === 0) {
            return true;
        }
        const latest = day.daily_reports[0];
        return latest.status === 'rejected';
    }

    function hasReport(day: TripDetail['days'][0]): boolean {
        return (
            day.daily_reports && day.daily_reports.length > 0
        );
    }

    function dayStatusLabel(status: string): string {
        return (
            {
                pending: 'Belum Dimulai',
                in_progress: 'Sedang Berjalan',
                completed: 'Selesai',
            }[status] ?? status
        );
    }

    function dayStatusBadgeClass(status: string): string {
        return (
            {
                pending:
                    'bg-gray-100 text-gray-700 border border-gray-200',
                in_progress:
                    'bg-purple/10 text-purple-text border border-purple/20',
                completed:
                    'bg-green/10 text-green-text border border-green/20',
            }[status] ??
            'bg-gray-100 text-gray-700 border border-gray-200'
        );
    }

    function honorTotal(
        honor: string,
        tipe: TripHonorTipe,
    ): number {
        const h = parseRupiah(honor);
        if (tipe === 'flat') return h;
        return h * hitungDurasiHari(
            trip.tanggal_mulai,
            trip.tanggal_selesai,
        );
    }
</script>

<svelte:head>
    <title>{trip.kode} | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Detail Trip" menuItems={mitraMenu}>
    <BackButton
        href="/mitra/trips"
        label="Kembali ke Trip Saya"
    />

    <!-- ==========================================
         HEADER
    ========================================== -->
    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6 mb-6"
    >
        <div class="flex flex-col gap-4">
            <div class="flex flex-wrap items-center gap-2">
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
                {#if tripMitra}
                    <span
                        class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold {tripMitraRoleBadge(
                            tripMitra.role,
                        )}"
                    >
                        Anda: {tripMitraRoleLabel(tripMitra.role)}
                    </span>
                {/if}
            </div>

            <h1 class="text-2xl font-extrabold text-dark">
                {(snapshot.nama as string) ?? trip.package?.nama ?? 'Trip'}
            </h1>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

            {#if trip.booking?.client}
                <div class="pt-4 border-t border-gray-100">
                    <p
                        class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2"
                    >
                        Client
                    </p>
                    <div class="flex items-center gap-3">
                        <div
                            class="w-10 h-10 rounded-full bg-gradient-to-br from-pink-dark to-purple text-white flex items-center justify-center font-bold text-sm"
                        >
                            {trip.booking.client.name
                                .charAt(0)
                                .toUpperCase()}
                        </div>
                        <div class="min-w-0">
                            <p
                                class="text-sm font-bold text-dark truncate"
                            >
                                {trip.booking.client.name}
                            </p>
                            <p
                                class="text-xs text-gray-500 truncate"
                            >
                                {trip.booking.client.email}
                            </p>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <!-- ==========================================
         MAIN LAYOUT
    ========================================== -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Kolom kiri (2/3) -->
        <div class="lg:col-span-2 space-y-6">
            <!-- ==========================================
                 ITINERARY + DAILY REPORTS
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
                            {trip.days.length} hari
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
                                    <!-- Timeline -->
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
                                            class="flex flex-wrap items-center gap-2 mb-1"
                                        >
                                            <h3
                                                class="text-sm font-extrabold text-dark"
                                            >
                                                {day.judul}
                                            </h3>
                                            <span
                                                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold {dayStatusBadgeClass(
                                                    day.status,
                                                )}"
                                            >
                                                {dayStatusLabel(
                                                    day.status,
                                                )}
                                            </span>
                                            {#if isTripDayToday(day)}
                                                <span
                                                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple/10 text-purple-text border border-purple/20"
                                                >
                                                    <span
                                                        class="w-1.5 h-1.5 rounded-full bg-purple animate-pulse"
                                                    ></span>
                                                    Hari ini
                                                </span>
                                            {/if}
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

                                        <!-- Daily Report -->
                                        {#if hasReport(day)}
                                            <div
                                                class="mt-3 pl-3 border-l-2 border-pink/20"
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
                                                                        <div
                                                                            class="w-12 h-12 rounded-lg overflow-hidden border border-gray-200"
                                                                        >
                                                                            <img
                                                                                src={`/storage/${media.path}`}
                                                                                alt="Bukti"
                                                                                class="w-full h-full object-cover"
                                                                            />
                                                                        </div>
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
                                                                        class="text-[10px] text-gray-600"
                                                                    >
                                                                        {formatDateTime(
                                                                            report.submitted_at,
                                                                        )}
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
                                                        </div>
                                                    </div>
                                                {/each}
                                            </div>
                                        {/if}

                                        <!-- Tombol Lapor -->
                                        {#if canReport(day)}
                                            <a
                                                href={`/mitra/trips/${trip.id}/days/${day.id}/report`}
                                                use:inertia
                                                class="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-dark text-white font-bold text-xs hover:bg-sun-dark transition-all shadow-md"
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
                                                        d="M12 4v16m8-8H4"
                                                    />
                                                </svg>
                                                {hasReport(day)
                                                    ? 'Upload Ulang'
                                                    : 'Lapor Hari Ini'}
                                            </a>
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
                                Dari paket
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

        <!-- Kolom kanan (1/3) -->
        <div class="lg:col-span-1">
            <div class="lg:sticky lg:top-24 space-y-4">
                {#if tripMitra}
                    <div
                        class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5"
                    >
                        <h3
                            class="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-3"
                        >
                            Tugas Saya
                        </h3>
                        <dl class="space-y-3 text-sm">
                            <div
                                class="flex justify-between gap-3"
                            >
                                <dt class="text-gray-500">Role</dt>
                                <dd class="text-right">
                                    <span
                                        class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold {tripMitraRoleBadge(
                                            tripMitra.role,
                                        )}"
                                    >
                                        {tripMitraRoleLabel(
                                            tripMitra.role,
                                        )}
                                    </span>
                                </dd>
                            </div>
                            <div
                                class="flex justify-between gap-3"
                            >
                                <dt class="text-gray-500">Honor</dt>
                                <dd
                                    class="font-bold text-dark text-right"
                                >
                                    {formatCurrency(
                                        tripMitra.honor,
                                    )}
                                </dd>
                            </div>
                            <div
                                class="flex justify-between gap-3"
                            >
                                <dt class="text-gray-500">
                                    Tipe Honor
                                </dt>
                                <dd
                                    class="font-bold text-dark text-right"
                                >
                                    {tripMitra.honor_tipe === 'flat'
                                        ? 'Flat'
                                        : 'Per Hari'}
                                </dd>
                            </div>
                            <div
                                class="flex justify-between gap-3 pt-3 border-t border-gray-100"
                            >
                                <dt
                                    class="text-gray-500 font-bold"
                                >
                                    Total
                                </dt>
                                <dd
                                    class="font-extrabold text-green-text text-right"
                                >
                                    {formatCurrency(
                                        honorTotal(
                                            tripMitra.honor,
                                            tripMitra.honor_tipe,
                                        ),
                                    )}
                                </dd>
                            </div>
                        </dl>

                        {#if tripMitra.instruksi}
                            <div
                                class="mt-4 pt-4 border-t border-gray-100"
                            >
                                <p
                                    class="text-[10px] font-extrabold text-blue-text uppercase tracking-widest mb-2"
                                >
                                    Instruksi dari Admin
                                </p>
                                <div
                                    class="p-3 bg-blue/5 border border-blue/20 rounded-xl"
                                >
                                    <p
                                        class="text-xs text-blue-text whitespace-pre-line leading-relaxed"
                                    >
                                        {tripMitra.instruksi}
                                    </p>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}

                <!-- Rekan Tim -->
                {#if trip.mitras.length > 1}
                    <div
                        class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5"
                    >
                        <h3
                            class="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-3"
                        >
                            Tim Trip
                        </h3>
                        <div class="space-y-2">
                            {#each trip.mitras as tm (tm.id)}
                                <div
                                    class="flex items-center gap-2 p-2 rounded-xl bg-gray-50/70"
                                >
                                    <div
                                        class="w-8 h-8 rounded-full bg-gradient-to-br from-pink-dark to-purple text-white flex items-center justify-center font-bold text-xs flex-shrink-0"
                                    >
                                        {tm.mitra?.name
                                            ?.charAt(0)
                                            ?.toUpperCase() ?? '?'}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p
                                            class="text-xs font-bold text-dark truncate"
                                        >
                                            {tm.mitra?.name ?? '-'}
                                        </p>
                                        <p
                                            class="text-[10px] text-gray-500 truncate"
                                        >
                                            {tripMitraRoleLabel(
                                                tm.role,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- Info -->
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
                                Cara Lapor
                            </p>
                            <ol
                                class="text-[11px] text-blue-text/80 space-y-0.5 list-decimal list-inside"
                            >
                                <li>Tunggu trip aktif (hari ini)</li>
                                <li>
                                    Klik "Lapor Hari Ini" di hari
                                    yang sesuai
                                </li>
                                <li>Upload 1-2 foto bukti</li>
                                <li>Tunggu verifikasi admin</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</DashboardLayout>