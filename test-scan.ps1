$body = Get-Content 'test-scan.json' -Raw
$r = Invoke-RestMethod -Uri 'http://localhost:5000/scan' -Method POST -ContentType 'application/json' -Body $body
Write-Host "Hosts found: $($r.hosts.Count)"
Write-Host "Elapsed: $($r.meta.elapsed)s"
foreach ($h in $r.hosts) {
    $openPorts = ($h.ports | Where-Object { $_.state -eq 'open' } | ForEach-Object { "$($_.port)/$($_.service)" }) -join ', '
    Write-Host "  $($h.ip) | $openPorts"
}
