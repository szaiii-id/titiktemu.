/**
 * Types untuk nilai enum PHP di sisi frontend.
 *
 * Mirror dari `app/Enums/*`.
 * Dipakai oleh utils/enums.ts & komponen Badge.
 */

// ==========================================
// BOOKING
// ==========================================

export type BookingStatus =
    | 'pending_payment'
    | 'payment_verified'
    | 'confirmed'
    | 'in_progress'
    | 'completed'
    | 'cancelled';

export type PaymentMetode = 'transfer_bank' | 'tunai' | 'lainnya';

// ==========================================
// TRIP
// ==========================================

export type TripStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export type TripMitraRole = 'lead' | 'asisten';

export type TripHonorTipe = 'flat' | 'per_hari';

// ==========================================
// DAILY REPORT
// ==========================================

export type DailyReportStatus = 'submitted' | 'verified' | 'rejected';

// ==========================================
// PACKAGE
// ==========================================

export type PackageStatus = 'draft' | 'aktif' | 'arsip';

export type PackageKategori =
    | 'wisata_alam'
    | 'budaya'
    | 'kuliner'
    | 'petualangan'
    | 'lainnya';

export type PackageFacilityTipe = 'include' | 'exclude';

export type PackageDayCostKategori =
    | 'transportasi'
    | 'tiket'
    | 'konsumsi'
    | 'akomodasi'
    | 'lainnya';

export type PackageDayCostSatuan = 'total' | 'per_orang' | 'per_hari';

// ==========================================
// PAYOUT & WALLET
// ==========================================

export type PayoutStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export type WalletTransactionKategori =
    | 'honor_trip'
    | 'payout'
    | 'adjustment'
    | 'refund';

// ==========================================
// TIMEZONE
// ==========================================

export type TimezoneOption = {
    value: string;
    label: string;
};