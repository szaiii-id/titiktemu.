<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import BackButton from '@/global/BackButton.svelte';
    import ConfirmModal from '@/global/ConfirmModal.svelte';
    import FormModal from '@/global/FormModal.svelte';
    import RupiahInput from '@/global/RupiahInput.svelte';
    import { inertia, router } from '@inertiajs/svelte';
    import type {
        Package,
        PackageDay,
        PackageDayCost,
        PackageDayCostKategori,
        PackageDayCostSatuan,
        PackageFacility,
        PackageFacilityTipe,
        PackageHpp,
        PackageKategori,
        PackageMargin,
        PackageStatus,
        UserMini,
    } from '@/types';
    import {
        packageDayCostKategoriBadge,
        packageDayCostKategoriLabel,
        packageDayCostSatuanLabel,
        packageFacilityTipeLabel,
        packageKategoriBadge,
        packageKategoriLabel,
        packageStatusBadge,
        packageStatusLabel,
    } from '@/utils/enums';
    import { formatCurrency } from '@/utils/formatCurrency';
    import { formatDate } from '@/utils/formatDate';
    import { formatDurasi } from '@/utils/duration';
    import { parseRupiah } from '@/utils/form';
    import { timezoneLabelLong } from '@/utils/timezone';
    import { adminMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    type PackageDetail = Omit<
        Package,
        'days' | 'facilities' | 'creator'
    > & {
        creator: Pick<UserMini, 'id' | 'name' | 'email'> | null;
        days: Array<PackageDay & { costs: PackageDayCost[] }>;
        facilities: PackageFacility[];
    };

    let {
        package: pkg,
        hpp,
        margin,
    }: {
        package: PackageDetail;
        hpp: PackageHpp;
        margin: PackageMargin;
    } = $props();

    // ==========================================
    // TABS
    // ==========================================

    type Tab = 'itinerary' | 'hpp' | 'fasilitas';
    let activeTab = $state<Tab>('itinerary');

    // ==========================================
    // OPTIONS
    // ==========================================

    const costKategoriOptions: Array<{
        value: PackageDayCostKategori;
        label: string;
    }> = [
        { value: 'transportasi', label: 'Transportasi' },
        { value: 'tiket', label: 'Tiket' },
        { value: 'konsumsi', label: 'Konsumsi' },
        { value: 'akomodasi', label: 'Akomodasi' },
        { value: 'lainnya', label: 'Lainnya' },
    ];

    const costSatuanOptions: Array<{
        value: PackageDayCostSatuan;
        label: string;
    }> = [
        { value: 'total', label: 'Total' },
        { value: 'per_orang', label: 'Per Orang' },
        { value: 'per_hari', label: 'Per Hari' },
    ];

    const facilityTipeOptions: Array<{
        value: PackageFacilityTipe;
        label: string;
    }> = [
        { value: 'include', label: 'Termasuk (Include)' },
        { value: 'exclude', label: 'Tidak Termasuk (Exclude)' },
    ];

    // ==========================================
    // STATUS ACTIONS
    // ==========================================

    let showPublishModal = $state(false);
    let showArchiveModal = $state(false);
    let showDeleteModal = $state(false);
    let actionProcessing = $state(false);

    function publishPackage() {
        actionProcessing = true;
        router.post(
            `/admin/packages/${pkg.id}/publish`,
            {},
            {
                onFinish: () => {
                    actionProcessing = false;
                    showPublishModal = false;
                },
            },
        );
    }

    function archivePackage() {
        actionProcessing = true;
        router.post(
            `/admin/packages/${pkg.id}/archive`,
            {},
            {
                onFinish: () => {
                    actionProcessing = false;
                    showArchiveModal = false;
                },
            },
        );
    }

    function restorePackage() {
        actionProcessing = true;
        router.post(
            `/admin/packages/${pkg.id}/restore`,
            {},
            {
                onFinish: () => {
                    actionProcessing = false;
                },
            },
        );
    }

    function deletePackage() {
        actionProcessing = true;
        router.delete(`/admin/packages/${pkg.id}`, {
            onFinish: () => {
                actionProcessing = false;
            },
        });
    }

    // ==========================================
    // DAY MANAGEMENT
    // ==========================================

    let showDayModal = $state(false);
    let editingDay = $state<PackageDay | null>(null);
    let dayForm = $state({
        judul: '',
        deskripsi: '',
        jam_mulai: '',
        jam_selesai: '',
        lokasi: '',
    });
    let dayErrors = $state<Record<string, string>>({});
    let dayProcessing = $state(false);

    function openCreateDayModal() {
        editingDay = null;
        dayForm = {
            judul: '',
            deskripsi: '',
            jam_mulai: '',
            jam_selesai: '',
            lokasi: '',
        };
        dayErrors = {};
        showDayModal = true;
    }

    function openEditDayModal(day: PackageDay) {
        editingDay = day;
        dayForm = {
            judul: day.judul,
            deskripsi: day.deskripsi ?? '',
            jam_mulai: day.jam_mulai ? day.jam_mulai.slice(0, 5) : '',
            jam_selesai: day.jam_selesai ? day.jam_selesai.slice(0, 5) : '',
            lokasi: day.lokasi ?? '',
        };
        dayErrors = {};
        showDayModal = true;
    }

    function submitDay() {
        dayErrors = {};
        dayProcessing = true;

        const payload = {
            judul: dayForm.judul,
            deskripsi: dayForm.deskripsi || null,
            jam_mulai: dayForm.jam_mulai || null,
            jam_selesai: dayForm.jam_selesai || null,
            lokasi: dayForm.lokasi || null,
        };

        if (editingDay) {
            router.put(`/admin/package-days/${editingDay.id}`, payload, {
                onError: (err) => {
                    dayErrors = err as Record<string, string>;
                    dayProcessing = false;
                },
                onSuccess: () => {
                    showDayModal = false;
                    dayProcessing = false;
                },
                onFinish: () => {
                    dayProcessing = false;
                },
            });
        } else {
            router.post(`/admin/packages/${pkg.id}/days`, payload, {
                onError: (err) => {
                    dayErrors = err as Record<string, string>;
                    dayProcessing = false;
                },
                onSuccess: () => {
                    showDayModal = false;
                    dayProcessing = false;
                },
                onFinish: () => {
                    dayProcessing = false;
                },
            });
        }
    }

    let dayToDelete = $state<PackageDay | null>(null);
    let dayDeleteProcessing = $state(false);

    function confirmDeleteDay(day: PackageDay) {
        dayToDelete = day;
    }

    function deleteDay() {
        if (!dayToDelete) return;
        dayDeleteProcessing = true;
        router.delete(`/admin/package-days/${dayToDelete.id}`, {
            onFinish: () => {
                dayDeleteProcessing = false;
                dayToDelete = null;
            },
        });
    }

    // ==========================================
    // COST MANAGEMENT
    // ==========================================

    let showCostModal = $state(false);
    let costDayId = $state<number | null>(null);
    let editingCost = $state<PackageDayCost | null>(null);
    let costForm = $state({
        nama_biaya: '',
        kategori: 'transportasi' as PackageDayCostKategori,
        jumlah: 0 as number,
        satuan: 'total' as PackageDayCostSatuan,
        catatan: '',
    });
    let costErrors = $state<Record<string, string>>({});
    let costProcessing = $state(false);

    function openCreateCostModal(dayId: number) {
        costDayId = dayId;
        editingCost = null;
        costForm = {
            nama_biaya: '',
            kategori: 'transportasi',
            jumlah: 0,
            satuan: 'total',
            catatan: '',
        };
        costErrors = {};
        showCostModal = true;
    }

    function openEditCostModal(dayId: number, cost: PackageDayCost) {
        costDayId = dayId;
        editingCost = cost;
        costForm = {
            nama_biaya: cost.nama_biaya,
            kategori: cost.kategori,
            jumlah: parseRupiah(cost.jumlah),
            satuan: cost.satuan,
            catatan: cost.catatan ?? '',
        };
        costErrors = {};
        showCostModal = true;
    }

    function submitCost() {
        costErrors = {};
        costProcessing = true;

        const payload = {
            nama_biaya: costForm.nama_biaya,
            kategori: costForm.kategori,
            jumlah: costForm.jumlah,
            satuan: costForm.satuan,
            catatan: costForm.catatan || null,
        };

        if (editingCost) {
            router.put(
                `/admin/package-day-costs/${editingCost.id}`,
                payload,
                {
                    onError: (err) => {
                        costErrors = err as Record<string, string>;
                        costProcessing = false;
                    },
                    onSuccess: () => {
                        showCostModal = false;
                        costProcessing = false;
                    },
                    onFinish: () => {
                        costProcessing = false;
                    },
                },
            );
        } else if (costDayId) {
            router.post(
                `/admin/package-days/${costDayId}/costs`,
                payload,
                {
                    onError: (err) => {
                        costErrors = err as Record<string, string>;
                        costProcessing = false;
                    },
                    onSuccess: () => {
                        showCostModal = false;
                        costProcessing = false;
                    },
                    onFinish: () => {
                        costProcessing = false;
                    },
                },
            );
        }
    }

    let costToDelete = $state<PackageDayCost | null>(null);
    let costDeleteProcessing = $state(false);

    function confirmDeleteCost(cost: PackageDayCost) {
        costToDelete = cost;
    }

    function deleteCost() {
        if (!costToDelete) return;
        costDeleteProcessing = true;
        router.delete(`/admin/package-day-costs/${costToDelete.id}`, {
            onFinish: () => {
                costDeleteProcessing = false;
                costToDelete = null;
            },
        });
    }

    // ==========================================
    // FACILITY MANAGEMENT
    // ==========================================

    let showFacilityModal = $state(false);
    let editingFacility = $state<PackageFacility | null>(null);
    let facilityForm = $state({
        tipe: 'include' as PackageFacilityTipe,
        nama: '',
    });
    let facilityErrors = $state<Record<string, string>>({});
    let facilityProcessing = $state(false);

    function openCreateFacilityModal(
        tipe: PackageFacilityTipe = 'include',
    ) {
        editingFacility = null;
        facilityForm = { tipe, nama: '' };
        facilityErrors = {};
        showFacilityModal = true;
    }

    function openEditFacilityModal(facility: PackageFacility) {
        editingFacility = facility;
        facilityForm = {
            tipe: facility.tipe,
            nama: facility.nama,
        };
        facilityErrors = {};
        showFacilityModal = true;
    }

    function submitFacility() {
        facilityErrors = {};
        facilityProcessing = true;

        const payload = {
            tipe: facilityForm.tipe,
            nama: facilityForm.nama,
        };

        if (editingFacility) {
            router.put(
                `/admin/package-facilities/${editingFacility.id}`,
                payload,
                {
                    onError: (err) => {
                        facilityErrors = err as Record<string, string>;
                        facilityProcessing = false;
                    },
                    onSuccess: () => {
                        showFacilityModal = false;
                        facilityProcessing = false;
                    },
                    onFinish: () => {
                        facilityProcessing = false;
                    },
                },
            );
        } else {
            router.post(
                `/admin/packages/${pkg.id}/facilities`,
                payload,
                {
                    onError: (err) => {
                        facilityErrors = err as Record<string, string>;
                        facilityProcessing = false;
                    },
                    onSuccess: () => {
                        showFacilityModal = false;
                        facilityProcessing = false;
                    },
                    onFinish: () => {
                        facilityProcessing = false;
                    },
                },
            );
        }
    }

    let facilityToDelete = $state<PackageFacility | null>(null);
    let facilityDeleteProcessing = $state(false);

    function confirmDeleteFacility(facility: PackageFacility) {
        facilityToDelete = facility;
    }

    function deleteFacility() {
        if (!facilityToDelete) return;
        facilityDeleteProcessing = true;
        router.delete(
            `/admin/package-facilities/${facilityToDelete.id}`,
            {
                onFinish: () => {
                    facilityDeleteProcessing = false;
                    facilityToDelete = null;
                },
            },
        );
    }

    // ==========================================
    // DERIVED
    // ==========================================

    let includeFacilities = $derived(
        pkg.facilities.filter((f) => f.tipe === 'include'),
    );
    let excludeFacilities = $derived(
        pkg.facilities.filter((f) => f.tipe === 'exclude'),
    );

    let hppPerKategoriEntries = $derived(
        Object.entries(hpp.per_kategori).sort((a, b) => b[1] - a[1]),
    );
</script>

<svelte:head>
    <title>{pkg.nama} | Titiktemu</title>
</svelte:head>

<DashboardLayout title="Detail Paket" menuItems={adminMenu}>
    <BackButton
        href="/admin/packages"
        label="Kembali ke Daftar Paket"
    />

    <!-- ==========================================
         HEADER: Info Paket
    ========================================== -->
    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6 mb-6"
    >
        <div class="flex flex-col lg:flex-row gap-5">
            <div
                class="w-full lg:w-48 h-32 rounded-2xl bg-gradient-to-br from-pink-dark to-purple flex items-center justify-center text-white font-extrabold text-4xl shadow-md flex-shrink-0"
            >
                {pkg.nama.charAt(0).toUpperCase()}
            </div>

            <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-2">
                    <span
                        class="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold {packageStatusBadge(
                            pkg.status,
                        )}"
                    >
                        {packageStatusLabel(pkg.status)}
                    </span>
                    <span
                        class="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold {packageKategoriBadge(
                            pkg.kategori,
                        )}"
                    >
                        {packageKategoriLabel(pkg.kategori)}
                    </span>
                    <span
                        class="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue/10 text-blue-text border border-blue/20"
                    >
                        {timezoneLabelLong(pkg.timezone)}
                    </span>
                </div>

                <h1 class="text-2xl font-extrabold text-dark mb-1">
                    {pkg.nama}
                </h1>
                <p class="text-xs text-gray-500 font-mono mb-3">
                    {pkg.kode}
                </p>

                {#if pkg.deskripsi}
                    <p class="text-sm text-gray-600 line-clamp-3 mb-3">
                        {pkg.deskripsi}
                    </p>
                {/if}

                <div
                    class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4"
                >
                    <div>
                        <p
                            class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest"
                        >
                            Durasi
                        </p>
                        <p class="text-sm font-bold text-dark">
                            {formatDurasi(
                                pkg.durasi_hari,
                                pkg.durasi_malam,
                            )}
                        </p>
                    </div>
                    <div>
                        <p
                            class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest"
                        >
                            Peserta
                        </p>
                        <p class="text-sm font-bold text-dark">
                            {pkg.min_peserta}–{pkg.max_peserta} orang
                        </p>
                    </div>
                    <div>
                        <p
                            class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest"
                        >
                            Harga/Orang
                        </p>
                        <p class="text-sm font-bold text-dark">
                            {formatCurrency(pkg.harga_per_orang)}
                        </p>
                    </div>
                    <div>
                        <p
                            class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest"
                        >
                            Dibuat
                        </p>
                        <p class="text-sm font-bold text-dark">
                            {formatDate(pkg.created_at)}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div
                class="flex flex-col gap-2 lg:w-44 flex-shrink-0"
            >
                <a
                    href={`/admin/packages/${pkg.id}/edit`}
                    use:inertia
                    class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-blue text-white font-bold text-sm hover:bg-blue-dark transition-all shadow-md"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                    </svg>
                    Edit Info
                </a>

                {#if pkg.status === 'draft'}
                    <button
                        type="button"
                        onclick={() => (showPublishModal = true)}
                        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-green-dark text-white font-bold text-sm hover:bg-green transition-all shadow-md"
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
                        Publish
                    </button>
                {/if}

                {#if pkg.status === 'aktif'}
                    <button
                        type="button"
                        onclick={() => (showArchiveModal = true)}
                        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-amber-800 text-white font-bold text-sm hover:bg-sun transition-all shadow-md"
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
                                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                            />
                        </svg>
                        Arsipkan
                    </button>
                {/if}

                {#if pkg.status === 'arsip'}
                    <button
                        type="button"
                        onclick={restorePackage}
                        disabled={actionProcessing}
                        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-purple text-white font-bold text-sm hover:bg-purple-dark transition-all shadow-md disabled:opacity-50"
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
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        Restore
                    </button>
                {/if}

                <button
                    type="button"
                    onclick={() => (showDeleteModal = true)}
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                    </svg>
                    Hapus
                </button>
            </div>
        </div>
    </div>

    <!-- ==========================================
         HPP SUMMARY
    ========================================== -->
    <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
    >
        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5"
        >
            <p
                class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1"
            >
                Total HPP
            </p>
            <p class="text-xl font-extrabold text-dark">
                {formatCurrency(hpp.total)}
            </p>
            <p class="text-[11px] text-gray-500 mt-1">
                Estimasi modal total
            </p>
        </div>
        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5"
        >
            <p
                class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1"
            >
                HPP / Orang
            </p>
            <p class="text-xl font-extrabold text-dark">
                {formatCurrency(margin.hpp_per_orang)}
            </p>
            <p class="text-[11px] text-gray-500 mt-1">
                Dibagi max peserta
            </p>
        </div>
        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5"
        >
            <p
                class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1"
            >
                Margin / Orang
            </p>
            <p
                class="text-xl font-extrabold {margin.margin_per_orang >= 0
                    ? 'text-green-text'
                    : 'text-red-600'}"
            >
                {formatCurrency(margin.margin_per_orang)}
            </p>
            <p class="text-[11px] text-gray-500 mt-1">
                Harga jual − HPP
            </p>
        </div>
        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm p-5"
        >
            <p
                class="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1"
            >
                Margin %
            </p>
            <p
                class="text-xl font-extrabold {margin.margin_persen >= 0
                    ? 'text-green-text'
                    : 'text-red-600'}"
            >
                {margin.margin_persen.toFixed(1)}%
            </p>
            <p class="text-[11px] text-gray-500 mt-1">
                Dari harga jual
            </p>
        </div>
    </div>

    <!-- ==========================================
         TABS
    ========================================== -->
    <div
        class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
    >
        <!-- Tab Headers -->
        <div class="border-b border-gray-100 px-4 sm:px-6 pt-4">
            <div class="flex gap-1 overflow-x-auto">
                <button
                    type="button"
                    onclick={() => (activeTab = 'itinerary')}
                    class="inline-flex items-center gap-2 px-4 py-3 rounded-t-2xl text-sm font-bold transition-all whitespace-nowrap
                        {activeTab === 'itinerary'
                        ? 'text-pink-text border-b-2 border-pink-dark'
                        : 'text-gray-500 hover:text-dark'}"
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
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                    Itinerary
                    <span
                        class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-extrabold {activeTab ===
                        'itinerary'
                            ? 'bg-pink-dark text-white'
                            : 'bg-gray-100 text-gray-500'}"
                    >
                        {pkg.days.length}
                    </span>
                </button>
                <button
                    type="button"
                    onclick={() => (activeTab = 'hpp')}
                    class="inline-flex items-center gap-2 px-4 py-3 rounded-t-2xl text-sm font-bold transition-all whitespace-nowrap
                        {activeTab === 'hpp'
                        ? 'text-pink-text border-b-2 border-pink-dark'
                        : 'text-gray-500 hover:text-dark'}"
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
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    HPP
                </button>
                <button
                    type="button"
                    onclick={() => (activeTab = 'fasilitas')}
                    class="inline-flex items-center gap-2 px-4 py-3 rounded-t-2xl text-sm font-bold transition-all whitespace-nowrap
                        {activeTab === 'fasilitas'
                        ? 'text-pink-text border-b-2 border-pink-dark'
                        : 'text-gray-500 hover:text-dark'}"
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
                            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                        />
                    </svg>
                    Fasilitas
                    <span
                        class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-extrabold {activeTab ===
                        'fasilitas'
                            ? 'bg-pink-dark text-white'
                            : 'bg-gray-100 text-gray-500'}"
                    >
                        {pkg.facilities.length}
                    </span>
                </button>
            </div>
        </div>

        <!-- ==========================================
             TAB: ITINERARY
        ========================================== -->
        {#if activeTab === 'itinerary'}
            <div class="p-5 sm:p-6">
                <div
                    class="flex items-center justify-between mb-5 gap-3 flex-wrap"
                >
                    <div>
                        <h2 class="text-lg font-extrabold text-dark">
                            Itinerary
                        </h2>
                        <p class="text-xs text-gray-500">
                            Rencana kegiatan per hari. Total: {pkg.days
                                .length} dari {pkg.durasi_hari} hari.
                        </p>
                    </div>
                    <button
                        type="button"
                        onclick={openCreateDayModal}
                        disabled={pkg.days.length >= pkg.durasi_hari}
                        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                        Tambah Hari
                    </button>
                </div>

                {#if pkg.days.length === 0}
                    <div
                        class="p-12 text-center border-2 border-dashed border-gray-200 rounded-2xl"
                    >
                        <p class="text-sm font-bold text-dark mb-1">
                            Belum ada hari
                        </p>
                        <p class="text-xs text-gray-500 mb-4">
                            Tambahkan Hari 1 untuk mulai menyusun
                            itinerary.
                        </p>
                        <button
                            type="button"
                            onclick={openCreateDayModal}
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
                            Tambah Hari 1
                        </button>
                    </div>
                {:else}
                    <div class="space-y-4">
                        {#each pkg.days as day (day.id)}
                            <div
                                class="border border-gray-200 rounded-2xl overflow-hidden"
                            >
                                <div
                                    class="bg-gray-50/80 px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                                >
                                    <div
                                        class="flex items-center gap-3 min-w-0"
                                    >
                                        <div
                                            class="w-10 h-10 rounded-xl bg-pink-dark text-white flex items-center justify-center font-extrabold text-sm flex-shrink-0"
                                        >
                                            H{day.hari_ke}
                                        </div>
                                        <div class="min-w-0">
                                            <p
                                                class="font-bold text-dark truncate"
                                            >
                                                {day.judul}
                                            </p>
                                            <div
                                                class="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap"
                                            >
                                                {#if day.jam_mulai}
                                                    <span
                                                        class="flex items-center gap-1"
                                                    >
                                                        <svg
                                                            class="w-3 h-3"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            stroke-width="2"
                                                        >
                                                            <path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                        {day.jam_mulai.slice(
                                                            0,
                                                            5,
                                                        )}{#if day.jam_selesai}
                                                            – {day.jam_selesai.slice(
                                                                0,
                                                                5,
                                                            )}{/if}
                                                    </span>
                                                {/if}
                                                {#if day.lokasi}
                                                    <span
                                                        class="flex items-center gap-1"
                                                    >
                                                        <svg
                                                            class="w-3 h-3"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            stroke-width="2"
                                                        >
                                                            <path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                            />
                                                            <path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                                            />
                                                        </svg>
                                                        {day.lokasi}
                                                    </span>
                                                {/if}
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        class="flex items-center gap-1 flex-shrink-0"
                                    >
                                        <button
                                            type="button"
                                            onclick={() =>
                                                openCreateCostModal(
                                                    day.id,
                                                )}
                                            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-sun-text bg-sun/10 hover:bg-sun/20 transition-all"
                                            aria-label="Tambah biaya HPP"
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
                                                    d="M12 4v16m8-8H4"
                                                />
                                            </svg>
                                            Biaya
                                        </button>
                                        <button
                                            type="button"
                                            onclick={() =>
                                                openEditDayModal(day)}
                                            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-blue bg-blue/5 hover:bg-blue/10 transition-all"
                                            aria-label="Edit hari"
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
                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                />
                                            </svg>
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onclick={() =>
                                                confirmDeleteDay(day)}
                                            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 transition-all"
                                            aria-label="Hapus hari"
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
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div class="px-4 py-3">
                                    {#if day.deskripsi}
                                        <p
                                            class="text-sm text-gray-600 mb-3"
                                        >
                                            {day.deskripsi}
                                        </p>
                                    {/if}

                                    {#if day.costs.length === 0}
                                        <p
                                            class="text-xs text-gray-400 italic"
                                        >
                                            Belum ada biaya HPP untuk
                                            hari ini.
                                        </p>
                                    {:else}
                                        <div class="space-y-1.5">
                                            {#each day.costs as cost (cost.id)}
                                                <div
                                                    class="flex items-center gap-3 text-sm py-1.5 px-3 rounded-xl bg-gray-50/50 hover:bg-gray-50"
                                                >
                                                    <span
                                                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold {packageDayCostKategoriBadge(
                                                            cost.kategori,
                                                        )}"
                                                    >
                                                        {packageDayCostKategoriLabel(
                                                            cost.kategori,
                                                        )}
                                                    </span>
                                                    <span
                                                        class="flex-1 text-dark font-medium truncate"
                                                        >{cost.nama_biaya}</span
                                                    >
                                                    <span
                                                        class="text-xs text-gray-500 whitespace-nowrap"
                                                        >{packageDayCostSatuanLabel(
                                                            cost.satuan,
                                                        )}</span
                                                    >
                                                    <span
                                                        class="text-sm font-extrabold text-dark whitespace-nowrap"
                                                        >{formatCurrency(
                                                            cost.jumlah,
                                                        )}</span
                                                    >
                                                    <button
                                                        type="button"
                                                        onclick={() =>
                                                            openEditCostModal(
                                                                day.id,
                                                                cost,
                                                            )}
                                                        class="text-blue hover:text-blue-text transition-colors"
                                                        aria-label="Edit biaya"
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
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onclick={() =>
                                                            confirmDeleteCost(
                                                                cost,
                                                            )}
                                                        class="text-red-600 hover:text-red-700 transition-colors"
                                                        aria-label="Hapus biaya"
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
                                            {/each}
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}

        <!-- ==========================================
             TAB: HPP
        ========================================== -->
        {#if activeTab === 'hpp'}
            <div class="p-5 sm:p-6">
                <div class="mb-5">
                    <h2 class="text-lg font-extrabold text-dark">
                        Breakdown HPP
                    </h2>
                    <p class="text-xs text-gray-500">
                        Rincian Harga Pokok Penjualan per kategori dan
                        per hari.
                    </p>
                </div>

                {#if hpp.breakdown.length === 0}
                    <div
                        class="p-12 text-center border-2 border-dashed border-gray-200 rounded-2xl"
                    >
                        <p class="text-sm font-bold text-dark mb-1">
                            Belum ada biaya HPP
                        </p>
                        <p class="text-xs text-gray-500">
                            Tambahkan biaya di tab Itinerary untuk
                            melihat breakdown.
                        </p>
                    </div>
                {:else}
                    <div class="mb-6">
                        <h3
                            class="text-sm font-extrabold text-dark uppercase tracking-wider mb-3"
                        >
                            Per Kategori
                        </h3>
                        <div
                            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                        >
                            {#each hppPerKategoriEntries as [kategori, jumlah] (kategori)}
                                <div
                                    class="border border-gray-200 rounded-2xl p-4"
                                >
                                    <span
                                        class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold {packageDayCostKategoriBadge(
                                            kategori,
                                        )} mb-2"
                                    >
                                        {packageDayCostKategoriLabel(
                                            kategori,
                                        )}
                                    </span>
                                    <p
                                        class="text-lg font-extrabold text-dark"
                                    >
                                        {formatCurrency(jumlah)}
                                    </p>
                                    <p
                                        class="text-[11px] text-gray-500 mt-1"
                                    >
                                        {hpp.total > 0
                                            ? ((
                                                  (jumlah /
                                                      hpp.total) *
                                                  100
                                              ).toFixed(1))
                                            : '0.0'}% dari total HPP
                                    </p>
                                </div>
                            {/each}
                        </div>
                    </div>

                    <div>
                        <h3
                            class="text-sm font-extrabold text-dark uppercase tracking-wider mb-3"
                        >
                            Rincian per Item
                        </h3>
                        <div
                            class="overflow-x-auto border border-gray-200 rounded-2xl"
                        >
                            <table class="w-full text-sm">
                                <thead
                                    class="bg-gray-50/80 border-b border-gray-200"
                                >
                                    <tr>
                                        <th
                                            class="text-left px-4 py-3 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest"
                                        >
                                            Hari
                                        </th>
                                        <th
                                            class="text-left px-4 py-3 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest"
                                        >
                                            Nama Biaya
                                        </th>
                                        <th
                                            class="text-left px-4 py-3 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest"
                                        >
                                            Kategori
                                        </th>
                                        <th
                                            class="text-left px-4 py-3 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest"
                                        >
                                            Satuan
                                        </th>
                                        <th
                                            class="text-right px-4 py-3 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest"
                                        >
                                            Jumlah
                                        </th>
                                        <th
                                            class="text-right px-4 py-3 font-extrabold text-gray-500 text-[10px] uppercase tracking-widest"
                                        >
                                            Subtotal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody
                                    class="divide-y divide-gray-100"
                                >
                                    {#each hpp.breakdown as item (item.hari_ke + '-' + item.nama_biaya + '-' + item.subtotal)}
                                        <tr
                                            class="hover:bg-gray-50/70"
                                        >
                                            <td
                                                class="px-4 py-3 text-xs font-bold text-gray-500"
                                            >
                                                H{item.hari_ke}
                                            </td>
                                            <td
                                                class="px-4 py-3 font-medium text-dark"
                                            >
                                                {item.nama_biaya}
                                            </td>
                                            <td class="px-4 py-3">
                                                <span
                                                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold {packageDayCostKategoriBadge(
                                                        item.kategori,
                                                    )}"
                                                >
                                                    {packageDayCostKategoriLabel(
                                                        item.kategori,
                                                    )}
                                                </span>
                                            </td>
                                            <td
                                                class="px-4 py-3 text-xs text-gray-500"
                                            >
                                                {packageDayCostSatuanLabel(
                                                    item.satuan,
                                                )}
                                            </td>
                                            <td
                                                class="px-4 py-3 text-right text-dark"
                                            >
                                                {formatCurrency(
                                                    item.jumlah,
                                                )}
                                            </td>
                                            <td
                                                class="px-4 py-3 text-right font-extrabold text-dark"
                                            >
                                                {formatCurrency(
                                                    item.subtotal,
                                                )}
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                                <tfoot
                                    class="bg-gray-50 border-t-2 border-gray-200"
                                >
                                    <tr>
                                        <td
                                            colspan="5"
                                            class="px-4 py-3 text-right font-extrabold text-dark uppercase tracking-wider text-xs"
                                        >
                                            Total HPP
                                        </td>
                                        <td
                                            class="px-4 py-3 text-right font-extrabold text-dark text-base"
                                        >
                                            {formatCurrency(hpp.total)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- ==========================================
             TAB: FASILITAS
        ========================================== -->
        {#if activeTab === 'fasilitas'}
            <div class="p-5 sm:p-6">
                <div
                    class="flex items-center justify-between mb-5 gap-3 flex-wrap"
                >
                    <div>
                        <h2 class="text-lg font-extrabold text-dark">
                            Fasilitas
                        </h2>
                        <p class="text-xs text-gray-500">
                            Daftar fasilitas yang termasuk & tidak
                            termasuk.
                        </p>
                    </div>
                    <button
                        type="button"
                        onclick={() =>
                            openCreateFacilityModal('include')}
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
                        Tambah Fasilitas
                    </button>
                </div>

                <div
                    class="grid grid-cols-1 lg:grid-cols-2 gap-5"
                >
                    <!-- Include -->
                    <div
                        class="border border-green/20 bg-green/5 rounded-2xl p-4"
                    >
                        <div
                            class="flex items-center gap-2 mb-3"
                        >
                            <div
                                class="w-7 h-7 rounded-lg bg-green-dark text-white flex items-center justify-center flex-shrink-0"
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
                            </div>
                            <h3
                                class="text-sm font-extrabold text-green-text uppercase tracking-wider"
                            >
                                Termasuk
                            </h3>
                            <span
                                class="ml-auto inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-[10px] font-extrabold bg-green-dark text-white"
                            >
                                {includeFacilities.length}
                            </span>
                        </div>
                        {#if includeFacilities.length === 0}
                            <p
                                class="text-xs text-gray-500 italic py-3"
                            >
                                Belum ada fasilitas include.
                            </p>
                        {:else}
                            <ul class="space-y-1.5">
                                {#each includeFacilities as facility (facility.id)}
                                    <li
                                        class="flex items-center gap-2 py-1.5 px-3 bg-white rounded-xl"
                                    >
                                        <svg
                                            class="w-4 h-4 text-green-text flex-shrink-0"
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
                                        <span
                                            class="flex-1 text-sm font-medium text-dark"
                                            >{facility.nama}</span
                                        >
                                        <button
                                            type="button"
                                            onclick={() =>
                                                openEditFacilityModal(
                                                    facility,
                                                )}
                                            class="text-blue hover:text-blue-text transition-colors"
                                            aria-label="Edit fasilitas"
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
                                        </button>
                                        <button
                                            type="button"
                                            onclick={() =>
                                                confirmDeleteFacility(
                                                    facility,
                                                )}
                                            class="text-red-600 hover:text-red-700 transition-colors"
                                            aria-label="Hapus fasilitas"
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
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>
                                        </button>
                                    </li>
                                {/each}
                            </ul>
                        {/if}
                    </div>

                    <!-- Exclude -->
                    <div
                        class="border border-red-200 bg-red-50/50 rounded-2xl p-4"
                    >
                        <div
                            class="flex items-center gap-2 mb-3"
                        >
                            <div
                                class="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center flex-shrink-0"
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
                            </div>
                            <h3
                                class="text-sm font-extrabold text-red-700 uppercase tracking-wider"
                            >
                                Tidak Termasuk
                            </h3>
                            <span
                                class="ml-auto inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-[10px] font-extrabold bg-red-600 text-white"
                            >
                                {excludeFacilities.length}
                            </span>
                        </div>
                        {#if excludeFacilities.length === 0}
                            <p
                                class="text-xs text-gray-500 italic py-3"
                            >
                                Belum ada fasilitas exclude.
                            </p>
                        {:else}
                            <ul class="space-y-1.5">
                                {#each excludeFacilities as facility (facility.id)}
                                    <li
                                        class="flex items-center gap-2 py-1.5 px-3 bg-white rounded-xl"
                                    >
                                        <svg
                                            class="w-4 h-4 text-red-600 flex-shrink-0"
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
                                        <span
                                            class="flex-1 text-sm font-medium text-dark"
                                            >{facility.nama}</span
                                        >
                                        <button
                                            type="button"
                                            onclick={() =>
                                                openEditFacilityModal(
                                                    facility,
                                                )}
                                            class="text-blue hover:text-blue-text transition-colors"
                                            aria-label="Edit fasilitas"
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
                                        </button>
                                        <button
                                            type="button"
                                            onclick={() =>
                                                confirmDeleteFacility(
                                                    facility,
                                                )}
                                            class="text-red-600 hover:text-red-700 transition-colors"
                                            aria-label="Hapus fasilitas"
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
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>
                                        </button>
                                    </li>
                                {/each}
                            </ul>
                        {/if}
                    </div>
                </div>
            </div>
        {/if}
    </div>
</DashboardLayout>

<!-- ==========================================
     MODALS
========================================== -->

<!-- Publish -->
<ConfirmModal
    bind:open={showPublishModal}
    variant="success"
    title="Publish Paket?"
    description="Paket akan tampil di katalog client dan bisa dipesan. Pastikan itinerary & fasilitas sudah lengkap."
    confirmLabel="Ya, Publish"
    processing={actionProcessing}
    onConfirm={publishPackage}
/>

<!-- Archive -->
<ConfirmModal
    bind:open={showArchiveModal}
    variant="warning"
    title="Arsipkan Paket?"
    description="Paket tidak akan tampil di katalog. Data booking lama tetap aman."
    confirmLabel="Ya, Arsipkan"
    processing={actionProcessing}
    onConfirm={archivePackage}
/>

<!-- Delete -->
<ConfirmModal
    bind:open={showDeleteModal}
    variant="danger"
    title="Hapus Paket?"
    description={`Paket "${pkg.nama}" akan dihapus. Tindakan ini tidak bisa dibatalkan.`}
    confirmLabel="Ya, Hapus"
    processing={actionProcessing}
    onConfirm={deletePackage}
/>

<!-- Day Form Modal -->
<FormModal
    bind:open={showDayModal}
    title={editingDay
        ? `Edit Hari ${editingDay.hari_ke}`
        : 'Tambah Hari Baru'}
    submitLabel={editingDay ? 'Simpan' : 'Tambah'}
    processing={dayProcessing}
    onSubmit={submitDay}
>
    {#snippet children()}
        <div>
            <label
                for="day_judul"
                class="block text-xs font-bold text-dark mb-1.5"
            >
                Judul <span class="text-pink">*</span>
            </label>
            <input
                id="day_judul"
                type="text"
                bind:value={dayForm.judul}
                required
                placeholder="Contoh: Penjemputan & Pasar Terapung"
                class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:outline-none transition-all {dayErrors.judul
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 focus:border-pink focus:bg-white'}"
            />
            {#if dayErrors.judul}
                <p class="text-pink text-[11px] mt-1 font-bold">
                    {dayErrors.judul}
                </p>
            {/if}
        </div>
        <div>
            <label
                for="day_deskripsi"
                class="block text-xs font-bold text-dark mb-1.5"
            >
                Deskripsi
                <span class="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
                id="day_deskripsi"
                bind:value={dayForm.deskripsi}
                rows="2"
                placeholder="Detail kegiatan hari ini..."
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all resize-none"
            ></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label
                    for="day_jam_mulai"
                    class="block text-xs font-bold text-dark mb-1.5"
                >
                    Jam Mulai
                </label>
                <input
                    id="day_jam_mulai"
                    type="time"
                    bind:value={dayForm.jam_mulai}
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all"
                />
                {#if dayErrors.jam_mulai}
                    <p class="text-pink text-[11px] mt-1 font-bold">
                        {dayErrors.jam_mulai}
                    </p>
                {/if}
            </div>
            <div>
                <label
                    for="day_jam_selesai"
                    class="block text-xs font-bold text-dark mb-1.5"
                >
                    Jam Selesai
                </label>
                <input
                    id="day_jam_selesai"
                    type="time"
                    bind:value={dayForm.jam_selesai}
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all"
                />
                {#if dayErrors.jam_selesai}
                    <p class="text-pink text-[11px] mt-1 font-bold">
                        {dayErrors.jam_selesai}
                    </p>
                {/if}
            </div>
        </div>
        <div>
            <label
                for="day_lokasi"
                class="block text-xs font-bold text-dark mb-1.5"
            >
                Lokasi
                <span class="text-gray-400 font-normal">(opsional)</span>
            </label>
            <input
                id="day_lokasi"
                type="text"
                bind:value={dayForm.lokasi}
                placeholder="Contoh: Pasar Terapung Lok Baintan"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all"
            />
        </div>
    {/snippet}
</FormModal>

<!-- Cost Form Modal -->
<FormModal
    bind:open={showCostModal}
    title={editingCost ? 'Edit Biaya HPP' : 'Tambah Biaya HPP'}
    submitLabel={editingCost ? 'Simpan' : 'Tambah'}
    processing={costProcessing}
    onSubmit={submitCost}
>
    {#snippet children()}
        <div>
            <label
                for="cost_nama"
                class="block text-xs font-bold text-dark mb-1.5"
            >
                Nama Biaya <span class="text-pink">*</span>
            </label>
            <input
                id="cost_nama"
                type="text"
                bind:value={costForm.nama_biaya}
                required
                placeholder="Contoh: Sewa Kelotok"
                class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:outline-none transition-all {costErrors.nama_biaya
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 focus:border-pink focus:bg-white'}"
            />
            {#if costErrors.nama_biaya}
                <p class="text-pink text-[11px] mt-1 font-bold">
                    {costErrors.nama_biaya}
                </p>
            {/if}
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label
                    for="cost_kategori"
                    class="block text-xs font-bold text-dark mb-1.5"
                >
                    Kategori <span class="text-pink">*</span>
                </label>
                <select
                    id="cost_kategori"
                    bind:value={costForm.kategori}
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all cursor-pointer"
                >
                    {#each costKategoriOptions as opt}
                        <option value={opt.value}>{opt.label}</option>
                    {/each}
                </select>
            </div>
            <div>
                <label
                    for="cost_satuan"
                    class="block text-xs font-bold text-dark mb-1.5"
                >
                    Satuan <span class="text-pink">*</span>
                </label>
                <select
                    id="cost_satuan"
                    bind:value={costForm.satuan}
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all cursor-pointer"
                >
                    {#each costSatuanOptions as opt}
                        <option value={opt.value}>{opt.label}</option>
                    {/each}
                </select>
            </div>
        </div>
        <RupiahInput
            label="Jumlah"
            required
            bind:value={costForm.jumlah}
            error={costErrors.jumlah}
            placeholder="500000"
        />
        <div>
            <label
                for="cost_catatan"
                class="block text-xs font-bold text-dark mb-1.5"
            >
                Catatan
                <span class="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
                id="cost_catatan"
                bind:value={costForm.catatan}
                rows="2"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all resize-none"
            ></textarea>
        </div>
    {/snippet}
</FormModal>

<!-- Facility Form Modal -->
<FormModal
    bind:open={showFacilityModal}
    title={editingFacility
        ? 'Edit Fasilitas'
        : 'Tambah Fasilitas'}
    maxWidth="md"
    submitLabel={editingFacility ? 'Simpan' : 'Tambah'}
    processing={facilityProcessing}
    onSubmit={submitFacility}
>
    {#snippet children()}
        <div>
            <label
                for="facility_tipe"
                class="block text-xs font-bold text-dark mb-1.5"
            >
                Tipe <span class="text-pink">*</span>
            </label>
            <select
                id="facility_tipe"
                bind:value={facilityForm.tipe}
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all cursor-pointer"
            >
                {#each facilityTipeOptions as opt}
                    <option value={opt.value}>{opt.label}</option>
                {/each}
            </select>
        </div>
        <div>
            <label
                for="facility_nama"
                class="block text-xs font-bold text-dark mb-1.5"
            >
                Nama Fasilitas <span class="text-pink">*</span>
            </label>
            <input
                id="facility_nama"
                type="text"
                bind:value={facilityForm.nama}
                required
                placeholder="Contoh: Makan 3x"
                class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:outline-none transition-all {facilityErrors.nama
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 focus:border-pink focus:bg-white'}"
            />
            {#if facilityErrors.nama}
                <p class="text-pink text-[11px] mt-1 font-bold">
                    {facilityErrors.nama}
                </p>
            {/if}
        </div>
    {/snippet}
</FormModal>

<!-- Delete Day -->
<ConfirmModal
    open={dayToDelete !== null}
    variant="danger"
    title={`Hapus Hari ${dayToDelete?.hari_ke ?? ''}?`}
    description="Semua biaya HPP di hari ini juga akan terhapus. Hari setelahnya akan otomatis dinomori ulang."
    confirmLabel="Ya, Hapus"
    processing={dayDeleteProcessing}
    onConfirm={deleteDay}
    onCancel={() => (dayToDelete = null)}
/>

<!-- Delete Cost -->
<ConfirmModal
    open={costToDelete !== null}
    variant="danger"
    title="Hapus Biaya?"
    description={`Biaya "${costToDelete?.nama_biaya ?? ''}" akan dihapus dari HPP.`}
    confirmLabel="Ya, Hapus"
    processing={costDeleteProcessing}
    onConfirm={deleteCost}
    onCancel={() => (costToDelete = null)}
/>

<!-- Delete Facility -->
<ConfirmModal
    open={facilityToDelete !== null}
    variant="danger"
    title="Hapus Fasilitas?"
    description={`Fasilitas "${facilityToDelete?.nama ?? ''}" akan dihapus dari daftar.`}
    confirmLabel="Ya, Hapus"
    processing={facilityDeleteProcessing}
    onConfirm={deleteFacility}
    onCancel={() => (facilityToDelete = null)}
/>