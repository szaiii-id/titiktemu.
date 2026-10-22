/**
 * Mapping enum → label & badge class untuk tampilan UI.
 *
 * Sumber kebenaran: enum PHP di `app/Enums/*`.
 * File ini MIRROR dari PHP — kalau nilai enum di PHP berubah,
 * update file ini juga.
 *
 * Pemakaian:
 *
 *     import { bookingStatusLabel, bookingStatusBadge } from '@/utils/enums';
 *
 *     bookingStatusLabel('pending_payment');  // "Menunggu Pembayaran"
 *     bookingStatusBadge('confirmed');        // "bg-green/10 ..."
 */

import type {
    BookingStatus,
    DailyReportStatus,
    PackageDayCostKategori,
    PackageDayCostSatuan,
    PackageFacilityTipe,
    PackageKategori,
    PackageStatus,
    PaymentMetode,
    PayoutStatus,
    TripHonorTipe,
    TripMitraRole,
    TripStatus,
    WalletTransactionKategori,
} from '@/types';

// ==========================================
// BOOKING STATUS
// ==========================================

const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
    pending_payment: 'Menunggu Pembayaran',
    payment_verified: 'Pembayaran Diverifikasi',
    confirmed: 'Terkonfirmasi',
    in_progress: 'Sedang Berjalan',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
};

const BOOKING_STATUS_SHORT: Record<BookingStatus, string> = {
    pending_payment: 'Pending',
    payment_verified: 'Verifikasi',
    confirmed: 'Konfirmasi',
    in_progress: 'Berjalan',
    completed: 'Selesai',
    cancelled: 'Batal',
};

const BOOKING_STATUS_BADGE: Record<BookingStatus, string> = {
    pending_payment: 'bg-sun/10 text-sun-text border border-sun/20',
    payment_verified: 'bg-blue/10 text-blue-text border border-blue/20',
    confirmed: 'bg-green/10 text-green-text border border-green/20',
    in_progress: 'bg-purple/10 text-purple-text border border-purple/20',
    completed: 'bg-gray-100 text-gray-700 border border-gray-200',
    cancelled: 'bg-red-50 text-red-700 border border-red-200',
};

export function bookingStatusLabel(status: string): string {
    return BOOKING_STATUS_LABEL[status as BookingStatus] ?? status;
}

export function bookingStatusShort(status: string): string {
    return BOOKING_STATUS_SHORT[status as BookingStatus] ?? status;
}

export function bookingStatusBadge(status: string): string {
    return (
        BOOKING_STATUS_BADGE[status as BookingStatus] ??
        'bg-gray-100 text-gray-700 border border-gray-200'
    );
}

// ==========================================
// TRIP STATUS
// ==========================================

const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
    scheduled: 'Terjadwal',
    active: 'Sedang Berjalan',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
};

const TRIP_STATUS_SHORT: Record<TripStatus, string> = {
    scheduled: 'Terjadwal',
    active: 'Berjalan',
    completed: 'Selesai',
    cancelled: 'Batal',
};

const TRIP_STATUS_BADGE: Record<TripStatus, string> = {
    scheduled: 'bg-blue/10 text-blue-text border border-blue/20',
    active: 'bg-purple/10 text-purple-text border border-purple/20',
    completed: 'bg-green/10 text-green-text border border-green/20',
    cancelled: 'bg-red-50 text-red-700 border border-red-200',
};

export function tripStatusLabel(status: string): string {
    return TRIP_STATUS_LABEL[status as TripStatus] ?? status;
}

export function tripStatusShort(status: string): string {
    return TRIP_STATUS_SHORT[status as TripStatus] ?? status;
}

export function tripStatusBadge(status: string): string {
    return (
        TRIP_STATUS_BADGE[status as TripStatus] ??
        'bg-gray-100 text-gray-700 border border-gray-200'
    );
}

// ==========================================
// DAILY REPORT STATUS
// ==========================================

const DAILY_REPORT_STATUS_LABEL: Record<DailyReportStatus, string> = {
    submitted: 'Menunggu Verifikasi',
    verified: 'Terverifikasi',
    rejected: 'Ditolak',
};

const DAILY_REPORT_STATUS_SHORT: Record<DailyReportStatus, string> = {
    submitted: 'Pending',
    verified: 'Terverifikasi',
    rejected: 'Ditolak',
};

const DAILY_REPORT_STATUS_BADGE: Record<DailyReportStatus, string> = {
    submitted: 'bg-sun/10 text-sun-text border border-sun/20',
    verified: 'bg-green/10 text-green-text border border-green/20',
    rejected: 'bg-red-50 text-red-700 border border-red-200',
};

export function dailyReportStatusLabel(status: string): string {
    return DAILY_REPORT_STATUS_LABEL[status as DailyReportStatus] ?? status;
}

export function dailyReportStatusShort(status: string): string {
    return DAILY_REPORT_STATUS_SHORT[status as DailyReportStatus] ?? status;
}

export function dailyReportStatusBadge(status: string): string {
    return (
        DAILY_REPORT_STATUS_BADGE[status as DailyReportStatus] ??
        'bg-gray-100 text-gray-700 border border-gray-200'
    );
}

// ==========================================
// PAYOUT STATUS
// ==========================================

const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
    pending: 'Menunggu Review',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    paid: 'Sudah Ditransfer',
};

const PAYOUT_STATUS_BADGE: Record<PayoutStatus, string> = {
    pending: 'bg-sun/10 text-sun-text border border-sun/20',
    approved: 'bg-blue/10 text-blue-text border border-blue/20',
    rejected: 'bg-red-50 text-red-700 border border-red-200',
    paid: 'bg-green/10 text-green-text border border-green/20',
};

export function payoutStatusLabel(status: string): string {
    return PAYOUT_STATUS_LABEL[status as PayoutStatus] ?? status;
}

export function payoutStatusBadge(status: string): string {
    return (
        PAYOUT_STATUS_BADGE[status as PayoutStatus] ??
        'bg-gray-100 text-gray-700 border border-gray-200'
    );
}

// ==========================================
// PACKAGE STATUS
// ==========================================

const PACKAGE_STATUS_LABEL: Record<PackageStatus, string> = {
    draft: 'Draft',
    aktif: 'Aktif',
    arsip: 'Arsip',
};

const PACKAGE_STATUS_BADGE: Record<PackageStatus, string> = {
    draft: 'bg-gray-100 text-gray-700 border border-gray-200',
    aktif: 'bg-green/10 text-green-text border border-green/20',
    arsip: 'bg-sun/10 text-sun-text border border-sun/20',
};

export function packageStatusLabel(status: string): string {
    return PACKAGE_STATUS_LABEL[status as PackageStatus] ?? status;
}

export function packageStatusBadge(status: string): string {
    return (
        PACKAGE_STATUS_BADGE[status as PackageStatus] ??
        'bg-gray-100 text-gray-700 border border-gray-200'
    );
}

// ==========================================
// PACKAGE KATEGORI
// ==========================================

const PACKAGE_KATEGORI_LABEL: Record<PackageKategori, string> = {
    wisata_alam: 'Wisata Alam',
    budaya: 'Budaya',
    kuliner: 'Kuliner',
    petualangan: 'Petualangan',
    lainnya: 'Lainnya',
};

const PACKAGE_KATEGORI_BADGE: Record<PackageKategori, string> = {
    wisata_alam: 'bg-green/10 text-green-text border border-green/20',
    budaya: 'bg-purple/10 text-purple-text border border-purple/20',
    kuliner: 'bg-sun/10 text-sun-text border border-sun/20',
    petualangan: 'bg-blue/10 text-blue-text border border-blue/20',
    lainnya: 'bg-gray-100 text-gray-700 border border-gray-200',
};

export function packageKategoriLabel(kategori: string): string {
    return PACKAGE_KATEGORI_LABEL[kategori as PackageKategori] ?? kategori;
}

export function packageKategoriBadge(kategori: string): string {
    return (
        PACKAGE_KATEGORI_BADGE[kategori as PackageKategori] ??
        'bg-gray-100 text-gray-700 border border-gray-200'
    );
}

// ==========================================
// TRIP MITRA ROLE
// ==========================================

const TRIP_MITRA_ROLE_LABEL: Record<TripMitraRole, string> = {
    lead: 'Lead',
    asisten: 'Asisten',
};

const TRIP_MITRA_ROLE_BADGE: Record<TripMitraRole, string> = {
    lead: 'bg-pink/10 text-pink-text border border-pink/20',
    asisten: 'bg-blue/10 text-blue-text border border-blue/20',
};

export function tripMitraRoleLabel(role: string): string {
    return TRIP_MITRA_ROLE_LABEL[role as TripMitraRole] ?? role;
}

export function tripMitraRoleBadge(role: string): string {
    return (
        TRIP_MITRA_ROLE_BADGE[role as TripMitraRole] ??
        'bg-gray-100 text-gray-700 border border-gray-200'
    );
}

// ==========================================
// PACKAGE FACILITY TIPE
// ==========================================

const PACKAGE_FACILITY_TIPE_LABEL: Record<PackageFacilityTipe, string> = {
    include: 'Termasuk',
    exclude: 'Tidak Termasuk',
};

const PACKAGE_FACILITY_TIPE_BADGE: Record<PackageFacilityTipe, string> = {
    include: 'bg-green/10 text-green-text border border-green/20',
    exclude: 'bg-red-50 text-red-700 border border-red-200',
};

export function packageFacilityTipeLabel(tipe: string): string {
    return PACKAGE_FACILITY_TIPE_LABEL[tipe as PackageFacilityTipe] ?? tipe;
}

export function packageFacilityTipeBadge(tipe: string): string {
    return (
        PACKAGE_FACILITY_TIPE_BADGE[tipe as PackageFacilityTipe] ??
        'bg-gray-100 text-gray-700 border border-gray-200'
    );
}

// ==========================================
// PACKAGE DAY COST KATEGORI
// ==========================================

const PACKAGE_DAY_COST_KATEGORI_LABEL: Record<PackageDayCostKategori, string> = {
    transportasi: 'Transportasi',
    tiket: 'Tiket',
    konsumsi: 'Konsumsi',
    akomodasi: 'Akomodasi',
    lainnya: 'Lainnya',
};

const PACKAGE_DAY_COST_KATEGORI_BADGE: Record<PackageDayCostKategori, string> = {
    transportasi: 'bg-blue/10 text-blue-text border border-blue/20',
    tiket: 'bg-purple/10 text-purple-text border border-purple/20',
    konsumsi: 'bg-sun/10 text-sun-text border border-sun/20',
    akomodasi: 'bg-pink/10 text-pink-text border border-pink/20',
    lainnya: 'bg-gray-100 text-gray-700 border border-gray-200',
};

export function packageDayCostKategoriLabel(kategori: string): string {
    return (
        PACKAGE_DAY_COST_KATEGORI_LABEL[kategori as PackageDayCostKategori] ??
        kategori
    );
}

export function packageDayCostKategoriBadge(kategori: string): string {
    return (
        PACKAGE_DAY_COST_KATEGORI_BADGE[kategori as PackageDayCostKategori] ??
        'bg-gray-100 text-gray-700 border border-gray-200'
    );
}

// ==========================================
// PACKAGE DAY COST SATUAN
// ==========================================

const PACKAGE_DAY_COST_SATUAN_LABEL: Record<PackageDayCostSatuan, string> = {
    total: 'Total',
    per_orang: 'Per Orang',
    per_hari: 'Per Hari',
};

export function packageDayCostSatuanLabel(satuan: string): string {
    return (
        PACKAGE_DAY_COST_SATUAN_LABEL[satuan as PackageDayCostSatuan] ?? satuan
    );
}

// ==========================================
// PAYMENT METODE
// ==========================================

const PAYMENT_METODE_LABEL: Record<PaymentMetode, string> = {
    transfer_bank: 'Transfer Bank',
    tunai: 'Tunai',
    lainnya: 'Lainnya',
};

export function paymentMetodeLabel(metode: string): string {
    return PAYMENT_METODE_LABEL[metode as PaymentMetode] ?? metode;
}

// ==========================================
// WALLET TRANSACTION KATEGORI
// ==========================================

const WALLET_TRANSACTION_KATEGORI_LABEL: Record<
    WalletTransactionKategori,
    string
> = {
    honor_trip: 'Honor Trip',
    payout: 'Pencairan',
    adjustment: 'Penyesuaian',
    refund: 'Refund',
};

export function walletTransactionKategoriLabel(kategori: string): string {
    return (
        WALLET_TRANSACTION_KATEGORI_LABEL[
            kategori as WalletTransactionKategori
        ] ?? kategori
    );
}

// ==========================================
// TRIP HONOR TIPE
// ==========================================

const TRIP_HONOR_TIPE_LABEL: Record<TripHonorTipe, string> = {
    flat: 'Flat (Total)',
    per_hari: 'Per Hari',
};

export function tripHonorTipeLabel(tipe: string): string {
    return TRIP_HONOR_TIPE_LABEL[tipe as TripHonorTipe] ?? tipe;
}