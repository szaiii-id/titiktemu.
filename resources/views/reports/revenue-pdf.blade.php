<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan Pendapatan</title>
    <style>
        @page {
            margin: 40px 40px 40px 40px;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #333;
            line-height: 1.4;
        }
        
        /* HEADER */
        .header {
            border-bottom: 3px solid #db2777; /* Warna Pink */
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header-table {
            width: 100%;
            border: none;
        }
        .header-table td {
            border: none;
            padding: 0;
            vertical-align: bottom;
        }
        .company-name {
            font-size: 24px;
            font-weight: 900;
            color: #db2777;
            margin: 0;
            letter-spacing: -0.5px;
        }
        .report-title {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            margin: 5px 0 0 0;
        }
        .report-period {
            font-size: 11px;
            color: #6b7280;
            text-align: right;
            margin: 0;
        }
        
        /* RINGKASAN */
        .summary-container {
            width: 100%;
            margin-bottom: 25px;
            border-spacing: 10px 0;
            border-collapse: separate;
        }
        .summary-card {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            width: 33%;
        }
        .summary-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #6b7280;
            margin: 0 0 5px 0;
        }
        .summary-value {
            font-size: 16px;
            font-weight: 900;
            color: #111827;
            margin: 0;
        }
        .summary-value.green { color: #059669; }
        .summary-value.red { color: #dc2626; }
        
        /* TABEL */
        .table-title {
            font-size: 12px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e5e7eb;
        }
        .data-table th, .data-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
            border-right: 1px solid #e5e7eb;
        }
        .data-table th {
            background-color: #db2777;
            color: #ffffff;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: left;
        }
        .data-table tr:nth-child(even) {
            background-color: #f9fafb;
        }
        
        /* BADGE STATUS */
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .badge-success { background-color: #d1fae5; color: #065f46; }
        .badge-warning { background-color: #fef3c7; color: #92400e; }
        .badge-info { background-color: #dbeafe; color: #1e40af; }
        
        /* FOOTER */
        .footer {
            margin-top: 30px;
            text-align: right;
            font-size: 9px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
        }
    </style>
</head>
<body>

    <!-- HEADER -->
    <div class="header">
        <table class="header-table">
            <tr>
                <td>
                    <h1 class="company-name">TITIKTEMU.</h1>
                    <p class="report-title">Laporan Pendapatan & Keuangan</p>
                </td>
                <td style="text-align: right;">
                    <p class="report-period">Periode:</p>
                    <p class="report-period" style="font-weight: bold; color: #1f2937;">
                        {{ \Carbon\Carbon::parse($startDate)->translatedFormat('d F Y') }} - 
                        {{ \Carbon\Carbon::parse($endDate)->translatedFormat('d F Y') }}
                    </p>
                </td>
            </tr>
        </table>
    </div>

    <!-- RINGKASAN -->
    <table class="summary-container">
        <tr>
            <td class="summary-card">
                <p class="summary-label">Total Pendapatan</p>
                <p class="summary-value">Rp {{ number_format($data['total_revenue'], 0, ',', '.') }}</p>
            </td>
            <td class="summary-card">
                <p class="summary-label">Total Honor Mitra</p>
                <p class="summary-value red">Rp {{ number_format($data['total_honor'], 0, ',', '.') }}</p>
            </td>
            <td class="summary-card" style="border-color: #a7f3d0; background-color: #ecfdf5;">
                <p class="summary-label" style="color: #047857;">Laba Kotor</p>
                <p class="summary-value green">Rp {{ number_format($data['gross_profit'], 0, ',', '.') }}</p>
            </td>
        </tr>
    </table>

    <!-- TABEL TRANSAKSI -->
    <p class="table-title">Rincian Transaksi</p>
    <table class="data-table">
        <thead>
            <tr>
                <th>Kode</th>
                <th>Tanggal</th>
                <th>Client</th>
                <th>Paket</th>
                <th style="text-align: right;">Total</th>
                <th style="text-align: center;">Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['transactions'] as $t)
            <tr>
                <td style="font-weight: bold; color: #374151;">{{ $t['kode'] }}</td>
                <td>{{ \Carbon\Carbon::parse($t['tanggal'])->translatedFormat('d M Y') }}</td>
                <td>{{ $t['client'] }}</td>
                <td>{{ $t['paket'] }}</td>
                <td style="text-align: right; font-weight: bold;">Rp {{ number_format($t['total'], 0, ',', '.') }}</td>
                <td style="text-align: center;">
                    @php
                        $status = strtolower($t['status']);
                        $badgeClass = 'badge-info';
                        if (in_array($status, ['confirmed', 'completed', 'paid'])) $badgeClass = 'badge-success';
                        elseif (in_array($status, ['pending', 'pending_payment'])) $badgeClass = 'badge-warning';
                    @endphp
                    <span class="badge {{ $badgeClass }}">{{ $t['status'] }}</span>
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="6" style="text-align: center; color: #9ca3af; padding: 20px;">
                    Tidak ada transaksi pada periode ini.
                </td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <!-- FOOTER -->
    <div class="footer">
        Dicetak pada: {{ now()->translatedFormat('d F Y, H:i') }} WITA<br>
        Laporan ini dibuat secara otomatis oleh sistem Titiktemu.
    </div>

</body>
</html>