<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan Kinerja Mitra</title>
    <style>
        @page { margin: 40px; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #333; }
        
        .header { border-bottom: 3px solid #db2777; padding-bottom: 15px; margin-bottom: 20px; }
        .header-table { width: 100%; border: none; }
        .header-table td { border: none; padding: 0; vertical-align: bottom; }
        .company-name { font-size: 24px; font-weight: 900; color: #db2777; margin: 0; }
        .report-title { font-size: 16px; font-weight: bold; color: #1f2937; margin: 5px 0 0 0; }
        .report-period { font-size: 11px; color: #6b7280; text-align: right; margin: 0; }
        
        .summary-container { width: 100%; margin-bottom: 25px; border-spacing: 10px 0; border-collapse: separate; }
        .summary-card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; width: 50%; }
        .summary-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin: 0 0 5px 0; }
        .summary-value { font-size: 16px; font-weight: 900; color: #111827; margin: 0; }
        
        .table-title { font-size: 12px; font-weight: bold; color: #374151; margin-bottom: 10px; text-transform: uppercase; }
        .data-table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; }
        .data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
        .data-table th { background-color: #db2777; color: #ffffff; font-weight: bold; font-size: 10px; text-transform: uppercase; text-align: left; }
        .data-table tr:nth-child(even) { background-color: #f9fafb; }
        
        .footer { margin-top: 30px; text-align: right; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <table class="header-table">
            <tr>
                <td>
                    <h1 class="company-name">TITIKTEMU.</h1>
                    <p class="report-title">Laporan Kinerja Mitra</p>
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
                <p class="summary-label">Total Mitra Aktif</p>
                <p class="summary-value">{{ $data['total_mitra'] }} Mitra</p>
            </td>
            <td class="summary-card">
                <p class="summary-label">Total Trip Diselesaikan</p>
                <p class="summary-value">{{ $data['total_trip_completed'] }} Trip</p>
            </td>
        </tr>
    </table>

    <p class="table-title">Peringkat Kinerja Mitra</p>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 30%;">Nama Mitra</th>
                <th style="width: 30%;">Email</th>
                <th style="width: 15%; text-align: center;">Total Trip</th>
                <th style="width: 20%; text-align: right;">Total Honor</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['mitras'] as $index => $m)
            <tr>
                <td style="text-align: center;">{{ $index + 1 }}</td>
                <td style="font-weight: bold;">{{ $m['name'] }}</td>
                <td>{{ $m['email'] }}</td>
                <td style="text-align: center;">{{ $m['total_trip'] }}</td>
                <td style="text-align: right; font-weight: bold;">Rp {{ number_format($m['total_honor'], 0, ',', '.') }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="5" style="text-align: center; color: #9ca3af; padding: 20px;">Tidak ada data mitra.</td>
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