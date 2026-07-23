# Run in PowerShell **as Administrator** to stop using flaky router DNS for Wi-Fi.
# After running: ipconfig /flushdns, then restart the backend (npm run dev).

$ifAlias = "Wi-Fi"
$servers = @("1.1.1.1", "8.8.8.8")

Set-DnsClientServerAddress -InterfaceAlias $ifAlias -ServerAddresses $servers
Clear-DnsClientCache
Write-Host "Set $ifAlias DNS to $($servers -join ', '). Test: nslookup api.airtable.com"
