<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan Payout</title>
    <style>
        @page { margin: 40px; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #333; }
        .header { border-bottom: 3px solid #059669; padding-bottom: 15px; margin-bottom: 20px; }
        .header-table { width: 100%; border: none; }
        .header-table td { border: none; padding: 0; vertical-align: bottom; }
        .company-name { font-size: 24px; font-weight: 900; color: #059669; margin: 0; }
        .report-title { font-size: 16px; font-weight: bold; color: #1f2937; margin: 5px 0 0 0; }
        .report-period { font-size: 11px; color: #6b7280; text-align: right; margin: 0; }
        .summary-container { width: 100%; margin-bottom: 25px; border-spacing: 10px 0; border-collapse: separate; }
        .summary-card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; width: 33%; }
        .summary-label { font-size: 10px; text-transform: uppercase; color: #6b7280; margin: 0 0 5px 0; }
        .summary-value { font-size: 16px; font-weight: 900; color: #111827; margin: 0; }
        .table-title { font-size: 12px; font-weight: bold; color: #374151; margin-bottom: 10px; text-transform: uppercase; }
        .data-table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; }
        .data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
        .data-table th { background-color: #059669; color: #ffffff; font-weight: bold; font-size: 10px; text-transform: uppercase; text-align: left; }
        .data-table tr:nth-child(even) { background-color: #f9fafb; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
        .badge-success { background-color: #d1fae5; color: #065f46; }
        .badge-warning { background-color: #fef3c7; color: #92400e; }
        .footer { margin-top: 30px; text-align: right; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <table class="header-table">
            <tr>
                <td>
                    <h1 class="company-name">TITIKTEMU.</h1>
                    <p class="report-title">Laporan Pencairan Dana (Payout)</p>
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

    <table class="summary-container">
        <tr>
            <td class="summary-card">
                <p class="summary-label">Total Dicairkan</p>
                <p class="summary-value" style="color: #059669;">Rp {{ number_format($data['total_dicairkan'], 0, ',', '.') }}</p>
            </td>
            <td class="summary-card">
                <p class="summary-label">Pending / Menunggu</p>
                <p class="summary-value" style="color: #d97706;">Rp {{ number_format($data['total_pending'], 0, ',', '.') }}</p>
            </td>
            <td class="summary-card">
                <p class="summary-label">Saldo Mengendap</p>
                <p class="summary-value" style="color: #2563eb;">Rp {{ number_format($data['total_saldo_mengendap'], 0, ',', '.') }}</p>
            </td>
        </tr>
    </table>

    <p class="table-title">Rincian Pencairan</p>
    <table class="data-table">
        <thead>
            <tr>
                <th>Kode Payout</th>
                <th>Mitra</th>
                <th>Tanggal Request</th>
                <th style="text-align: right;">Jumlah</th>
                <th style="text-align: center;">Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['payouts'] as $p)
            <tr>
                <td style="font-weight: bold; color: #374151;">{{ $p['kode'] }}</td>
                <td>{{ $p['mitra'] }}</td>
                <td>{{ \Carbon\Carbon::parse($p['tanggal'])->translatedFormat('d M Y') }}</td>
                <td style="text-align: right; font-weight: bold;">Rp {{ number_format($p['jumlah'], 0, ',', '.') }}</td>
                <td style="text-align: center;">
                    @php
                        $status = strtolower($p['status']);
                        $badgeClass = $status === 'paid' ? 'badge-success' : 'badge-warning';
                    @endphp
                    <span class="badge {{ $badgeClass }}">{{ $p['status'] }}</span>
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="5" style="text-align: center; color: #9ca3af; padding: 20px;">Tidak ada data payout pada periode ini.</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Dicetak pada: {{ now()->translatedFormat('d F Y, H:i') }} WITA<br>
        Laporan ini dibuat secara otomatis oleh sistem Titiktemu.
    </div>
</body>
</html>