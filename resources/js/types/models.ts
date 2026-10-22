/**
 * Types untuk entitas Model dari backend.
 *
 * Mirror dari `app/Models/*`.
 * Dipakai di props halaman (Inertia).
 *
 * Catatan:
 * - Field `decimal` (harga, honor, saldo) di-serialize sebagai STRING oleh
 *   Laravel (karena cast `decimal:2`). Pakai `formatCurrency` untuk tampilkan.
 * - Field `date` / `timestamp` di-serialize sebagai STRING (ISO 8601).
 * - Relasi opsional (`?`) karena tidak semua endpoint eager-load relasi.
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
} from './enum';

// ==========================================
// USER
// ==========================================

export type UserRole = 'admin' | 'mitra' | 'client';

export type User = {
    id: number;
    name: string;
    username: string | null;
    email: string;
    role: UserRole;
    timezone: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    profile?: Profile | null;
};

export type Profile = {
    id: number;
    user_id: number;
    tipe: string;
    nama_penyedia_usaha: string | null;
    nomor_identitas: string | null;
    alamat: string | null;
    telepon: string | null;
    provinsi: string | null;
    kota: string | null;
    kode_pos: string | null;
    logo: string | null;
    deskripsi: string | null;
    meta: Record<string, unknown> | null;
};

/**
 * User ringkas (untuk relasi di Booking, Trip, dll).
 */
export type UserMini = {
    id: number;
    name: string;
    email: string;
    username: string | null;
};

// ==========================================
// PACKAGE
// ==========================================

export type Package = {
    id: number;
    kode: string;
    nama: string;
    slug: string;
    deskripsi: string | null;
    kategori: PackageKategori;
    durasi_hari: number;
    durasi_malam: number;
    harga_per_orang: string;
    harga_per_rombongan: string | null;
    min_peserta: number;
    max_peserta: number;
    timezone: string;
    cover_image: string | null;
    status: PackageStatus;
    created_by: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;

    // Relasi opsional
    creator?: UserMini | null;
    days?: PackageDay[];
    facilities?: PackageFacility[];
};

export type PackageDay = {
    id: number;
    package_id: number;
    hari_ke: number;
    judul: string;
    deskripsi: string | null;
    jam_mulai: string | null;
    jam_selesai: string | null;
    lokasi: string | null;
    costs?: PackageDayCost[];
};

export type PackageDayCost = {
    id: number;
    package_day_id: number;
    nama_biaya: string;
    kategori: PackageDayCostKategori;
    jumlah: string;
    satuan: PackageDayCostSatuan;
    catatan: string | null;
};

export type PackageFacility = {
    id: number;
    package_id: number;
    tipe: PackageFacilityTipe;
    nama: string;
    urutan: number;
};

/**
 * HPP hasil perhitungan `Package::calculateHpp()`.
 */
export type PackageHpp = {
    total: number;
    per_kategori: Record<string, number>;
    breakdown: Array<{
        hari_ke: number;
        nama_biaya: string;
        kategori: string;
        jumlah: number;
        satuan: string;
        subtotal: number;
    }>;
};

/**
 * Margin hasil perhitungan `Package::calculateMargin()`.
 */
export type PackageMargin = {
    hpp_total: number;
    hpp_per_orang: number;
    harga_jual_per_orang: number;
    margin_per_orang: number;
    margin_persen: number;
};

// ==========================================
// BOOKING
// ==========================================

export type Booking = {
    id: number;
    kode: string;
    package_id: number;
    user_id: number;
    tanggal_keberangkatan: string; // DATE
    jumlah_peserta: number;
    total_harga: string;
    status: BookingStatus;
    expired_at: string | null;
    catatan: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;

    // Relasi opsional
    package?: Package | null;
    client?: UserMini | null;
    participants?: BookingParticipant[];
    payments?: Payment[];
};

export type BookingParticipant = {
    id: number;
    booking_id: number;
    nama: string;
    umur: number | null;
    no_hp: string | null;
    catatan: string | null;
};

export type Payment = {
    id: number;
    booking_id: number;
    jumlah: string;
    metode: PaymentMetode;
    bank_pengirim: string | null;
    nama_pengirim: string | null;
    bukti_transfer: string | null;
    verified_by: number | null;
    verified_at: string | null;
    catatan: string | null;
    created_at: string;
    updated_at: string;

    // Relasi opsional
    verifier?: UserMini | null;
};

// ==========================================
// TRIP
// ==========================================

export type Trip = {
    id: number;
    kode: string;
    booking_id: number;
    package_id: number;
    snapshot_package: Record<string, unknown>;
    tanggal_mulai: string; // DATE
    tanggal_selesai: string; // DATE
    jumlah_peserta: number;
    timezone: string;
    status: TripStatus;
    created_at: string;
    updated_at: string;

    // Relasi opsional
    package?: Package | null;
    booking?: Booking | null;
    mitras?: TripMitra[];
    days?: TripDay[];
};

export type TripMitra = {
    id: number;
    trip_id: number;
    mitra_id: number;
    role: TripMitraRole;
    honor: string;
    honor_tipe: TripHonorTipe;
    instruksi: string | null;
    assigned_by: number | null;
    assigned_at: string | null;
    created_at: string;
    updated_at: string;

    // Relasi opsional
    mitra?: UserMini | null;
    assigner?: UserMini | null;
};

export type TripDay = {
    id: number;
    trip_id: number;
    hari_ke: number;
    tanggal: string; // DATE
    judul: string;
    deskripsi: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    created_at: string;
    updated_at: string;

    // Relasi opsional
    daily_reports?: DailyReport[];
};

// ==========================================
// DAILY REPORT
// ==========================================

export type DailyReport = {
    id: number;
    trip_day_id: number;
    mitra_id: number;
    catatan: string | null;
    status: DailyReportStatus;
    submitted_at: string | null;
    verified_by: number | null;
    verified_at: string | null;
    rejection_reason: string | null;
    created_at: string;
    updated_at: string;

    // Relasi opsional
    trip_day?: TripDay | null;
    mitra?: UserMini | null;
    verifier?: UserMini | null;
    media?: DailyReportMedia[];
};

export type DailyReportMedia = {
    id: number;
    daily_report_id: number;
    path: string;
    urutan: number;
    created_at: string;
};

// ==========================================
// WALLET & PAYOUT
// ==========================================

export type MitraWallet = {
    id: number;
    mitra_id: number;
    saldo: string;
    total_pendapatan: string;
    total_dicairkan: string;
    created_at: string;
    updated_at: string;
};

export type WalletTransaction = {
    id: number;
    wallet_id: number;
    tipe: 'credit' | 'debit';
    jumlah: string;
    saldo_setelah: string;
    kategori: WalletTransactionKategori;
    referensi_type: string | null;
    referensi_id: number | null;
    deskripsi: string;
    created_at: string;
};

export type Payout = {
    id: number;
    kode: string;
    mitra_id: number;
    jumlah: string;
    bank_tujuan: string;
    no_rekening: string;
    nama_pemilik: string;
    status: PayoutStatus;
    requested_at: string | null;
    reviewed_by: number | null;
    reviewed_at: string | null;
    paid_at: string | null;
    rejection_reason: string | null;
    catatan: string | null;
    created_at: string;
    updated_at: string;

    // Relasi opsional
    mitra?: UserMini | null;
    reviewer?: UserMini | null;
};

// ==========================================
// E-TICKET
// ==========================================

export type ETicket = {
    id: number;
    uuid: string;
    trip_id: number;
    booking_id: number;
    qr_code: string;
    pdf_path: string;
    generated_at: string | null;
    created_at: string;

    // Relasi opsional
    trip?: Trip | null;
    booking?: Booking | null;
};

// ==========================================
// NOTIFICATION
// ==========================================

export type AppNotification = {
    id: string; // UUID
    user_id: number;
    tipe: string;
    judul: string;
    pesan: string;
    data: Record<string, unknown> | null;
    read_at: string | null;
    created_at: string;
};