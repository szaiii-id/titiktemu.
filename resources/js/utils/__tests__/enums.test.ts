import { describe, it, expect } from 'vitest';
import {
    // Booking
    bookingStatusLabel,
    bookingStatusShort,
    bookingStatusBadge,
    // Trip
    tripStatusLabel,
    tripStatusShort,
    tripStatusBadge,
    // Daily Report
    dailyReportStatusLabel,
    dailyReportStatusShort,
    dailyReportStatusBadge,
    // Payout
    payoutStatusLabel,
    payoutStatusBadge,
    // Package
    packageStatusLabel,
    packageStatusBadge,
    packageKategoriLabel,
    packageKategoriBadge,
    // Trip Mitra
    tripMitraRoleLabel,
    tripMitraRoleBadge,
    // Facility
    packageFacilityTipeLabel,
    packageFacilityTipeBadge,
    // Day Cost
    packageDayCostKategoriLabel,
    packageDayCostKategoriBadge,
    packageDayCostSatuanLabel,
    // Payment
    paymentMetodeLabel,
    // Wallet
    walletTransactionKategoriLabel,
    // Honor
    tripHonorTipeLabel,
} from '../enums';

// ============================================================
// FALLBACK BEHAVIOR
// ============================================================

describe('Fallback behavior', () => {
    it('mengembalikan nilai asli jika enum tidak dikenal', () => {
        expect(bookingStatusLabel('unknown')).toBe('unknown');
        expect(tripStatusLabel('unknown')).toBe('unknown');
        expect(payoutStatusLabel('unknown')).toBe('unknown');
        expect(packageKategoriLabel('unknown')).toBe('unknown');
        expect(paymentMetodeLabel('unknown')).toBe('unknown');
    });

    it('mengembalikan class fallback untuk badge jika enum tidak dikenal', () => {
        const fallback = 'bg-gray-100 text-gray-700 border border-gray-200';
        expect(bookingStatusBadge('unknown')).toBe(fallback);
        expect(tripStatusBadge('unknown')).toBe(fallback);
        expect(payoutStatusBadge('unknown')).toBe(fallback);
        expect(packageKategoriBadge('unknown')).toBe(fallback);
    });
});

// ============================================================
// BOOKING STATUS
// ============================================================

describe('Booking Status', () => {
    it('mengembalikan label yang benar', () => {
        expect(bookingStatusLabel('pending_payment')).toBe('Menunggu Pembayaran');
        expect(bookingStatusLabel('payment_verified')).toBe('Pembayaran Diverifikasi');
        expect(bookingStatusLabel('confirmed')).toBe('Terkonfirmasi');
        expect(bookingStatusLabel('in_progress')).toBe('Sedang Berjalan');
        expect(bookingStatusLabel('completed')).toBe('Selesai');
        expect(bookingStatusLabel('cancelled')).toBe('Dibatalkan');
    });

    it('mengembalikan label pendek yang benar', () => {
        expect(bookingStatusShort('pending_payment')).toBe('Pending');
        expect(bookingStatusShort('completed')).toBe('Selesai');
        expect(bookingStatusShort('cancelled')).toBe('Batal');
    });

    it('mengembalikan badge class yang benar', () => {
        expect(bookingStatusBadge('pending_payment')).toContain('bg-sun/10');
        expect(bookingStatusBadge('confirmed')).toContain('bg-green/10');
        expect(bookingStatusBadge('cancelled')).toContain('bg-red-50');
    });
});

// ============================================================
// TRIP STATUS
// ============================================================

describe('Trip Status', () => {
    it('mengembalikan label yang benar', () => {
        expect(tripStatusLabel('scheduled')).toBe('Terjadwal');
        expect(tripStatusLabel('active')).toBe('Sedang Berjalan');
        expect(tripStatusLabel('completed')).toBe('Selesai');
        expect(tripStatusLabel('cancelled')).toBe('Dibatalkan');
    });

    it('mengembalikan label pendek yang benar', () => {
        expect(tripStatusShort('active')).toBe('Berjalan');
        expect(tripStatusShort('cancelled')).toBe('Batal');
    });

    it('mengembalikan badge class yang benar', () => {
        expect(tripStatusBadge('active')).toContain('bg-purple/10');
        expect(tripStatusBadge('completed')).toContain('bg-green/10');
    });
});

// ============================================================
// DAILY REPORT STATUS
// ============================================================

describe('Daily Report Status', () => {
    it('mengembalikan label yang benar', () => {
        expect(dailyReportStatusLabel('submitted')).toBe('Menunggu Verifikasi');
        expect(dailyReportStatusLabel('verified')).toBe('Terverifikasi');
        expect(dailyReportStatusLabel('rejected')).toBe('Ditolak');
    });

    it('mengembalikan badge class yang benar', () => {
        expect(dailyReportStatusBadge('submitted')).toContain('bg-sun/10');
        expect(dailyReportStatusBadge('verified')).toContain('bg-green/10');
        expect(dailyReportStatusBadge('rejected')).toContain('bg-red-50');
    });
});

// ============================================================
// PAYOUT STATUS
// ============================================================

describe('Payout Status', () => {
    it('mengembalikan label yang benar', () => {
        expect(payoutStatusLabel('pending')).toBe('Menunggu Review');
        expect(payoutStatusLabel('approved')).toBe('Disetujui');
        expect(payoutStatusLabel('rejected')).toBe('Ditolak');
        expect(payoutStatusLabel('paid')).toBe('Sudah Ditransfer');
    });

    it('mengembalikan badge class yang benar', () => {
        expect(payoutStatusBadge('approved')).toContain('bg-blue/10');
        expect(payoutStatusBadge('paid')).toContain('bg-green/10');
    });
});

// ============================================================
// PACKAGE STATUS & KATEGORI
// ============================================================

describe('Package Status & Kategori', () => {
    it('mengembalikan label status paket', () => {
        expect(packageStatusLabel('draft')).toBe('Draft');
        expect(packageStatusLabel('aktif')).toBe('Aktif');
        expect(packageStatusLabel('arsip')).toBe('Arsip');
    });

    it('mengembalikan label kategori paket', () => {
        expect(packageKategoriLabel('wisata_alam')).toBe('Wisata Alam');
        expect(packageKategoriLabel('budaya')).toBe('Budaya');
        expect(packageKategoriLabel('kuliner')).toBe('Kuliner');
        expect(packageKategoriLabel('petualangan')).toBe('Petualangan');
        expect(packageKategoriLabel('lainnya')).toBe('Lainnya');
    });

    it('mengembalikan badge class kategori yang benar', () => {
        expect(packageKategoriBadge('wisata_alam')).toContain('bg-green/10');
        expect(packageKategoriBadge('budaya')).toContain('bg-purple/10');
    });
});

// ============================================================
// TRIP MITRA ROLE
// ============================================================

describe('Trip Mitra Role', () => {
    it('mengembalikan label role', () => {
        expect(tripMitraRoleLabel('lead')).toBe('Lead');
        expect(tripMitraRoleLabel('asisten')).toBe('Asisten');
    });

    it('mengembalikan badge class yang benar', () => {
        expect(tripMitraRoleBadge('lead')).toContain('bg-pink/10');
        expect(tripMitraRoleBadge('asisten')).toContain('bg-blue/10');
    });
});

// ============================================================
// PACKAGE FACILITY TIPE
// ============================================================

describe('Package Facility Tipe', () => {
    it('mengembalikan label fasilitas', () => {
        expect(packageFacilityTipeLabel('include')).toBe('Termasuk');
        expect(packageFacilityTipeLabel('exclude')).toBe('Tidak Termasuk');
    });

    it('mengembalikan badge class yang benar', () => {
        expect(packageFacilityTipeBadge('include')).toContain('bg-green/10');
        expect(packageFacilityTipeBadge('exclude')).toContain('bg-red-50');
    });
});

// ============================================================
// PACKAGE DAY COST
// ============================================================

describe('Package Day Cost', () => {
    it('mengembalikan label kategori biaya', () => {
        expect(packageDayCostKategoriLabel('transportasi')).toBe('Transportasi');
        expect(packageDayCostKategoriLabel('tiket')).toBe('Tiket');
        expect(packageDayCostKategoriLabel('konsumsi')).toBe('Konsumsi');
        expect(packageDayCostKategoriLabel('akomodasi')).toBe('Akomodasi');
        expect(packageDayCostKategoriLabel('lainnya')).toBe('Lainnya');
    });

    it('mengembalikan label satuan biaya', () => {
        expect(packageDayCostSatuanLabel('total')).toBe('Total');
        expect(packageDayCostSatuanLabel('per_orang')).toBe('Per Orang');
        expect(packageDayCostSatuanLabel('per_hari')).toBe('Per Hari');
    });
});

// ============================================================
// PAYMENT METODE
// ============================================================

describe('Payment Metode', () => {
    it('mengembalikan label metode pembayaran', () => {
        expect(paymentMetodeLabel('transfer_bank')).toBe('Transfer Bank');
        expect(paymentMetodeLabel('tunai')).toBe('Tunai');
        expect(paymentMetodeLabel('lainnya')).toBe('Lainnya');
    });
});

// ============================================================
// WALLET TRANSACTION KATEGORI
// ============================================================

describe('Wallet Transaction Kategori', () => {
    it('mengembalikan label kategori transaksi', () => {
        expect(walletTransactionKategoriLabel('honor_trip')).toBe('Honor Trip');
        expect(walletTransactionKategoriLabel('payout')).toBe('Pencairan');
        expect(walletTransactionKategoriLabel('adjustment')).toBe('Penyesuaian');
        expect(walletTransactionKategoriLabel('refund')).toBe('Refund');
    });
});

// ============================================================
// TRIP HONOR TIPE
// ============================================================

describe('Trip Honor Tipe', () => {
    it('mengembalikan label tipe honor', () => {
        expect(tripHonorTipeLabel('flat')).toBe('Flat (Total)');
        expect(tripHonorTipeLabel('per_hari')).toBe('Per Hari');
    });
});