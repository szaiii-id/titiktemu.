<?php

namespace App\Exports;

use App\Models\Booking;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class RevenueExport implements FromCollection, WithHeadings, WithMapping
{
    protected $startDate;

    protected $endDate;

    public function __construct($startDate, $endDate)
    {
        $this->startDate = $startDate;
        $this->endDate = $endDate;
    }

    /**
     * ✅ FIX: Tambahkan return type : Collection
     */
    public function collection(): Collection
    {
        return Booking::with(['client:id,name', 'package:id,nama']) // ✅ FIX: client, bukan user
            ->whereIn('status', ['confirmed', 'completed'])
            ->whereBetween('created_at', [$this->startDate.' 00:00:00', $this->endDate.' 23:59:59'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function headings(): array
    {
        return ['Kode Booking', 'Tanggal', 'Nama Client', 'Paket', 'Total Harga', 'Status'];
    }

    public function map($booking): array
    {
        return [
            $booking->kode,
            $booking->created_at->format('Y-m-d'),
            $booking->client->name ?? '-', // ✅ FIX: client
            $booking->package->nama ?? '-',
            $booking->total_harga,
            // ✅ FIX: Ambil value dari enum
            is_object($booking->status) ? $booking->status->value : $booking->status,
        ];
    }
}
