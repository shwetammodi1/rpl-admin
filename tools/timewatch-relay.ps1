# TimeWatch -> RPL relay
# Runs on the COLLEGE PC (same LAN as the biometric device).
# The device posts punches to this relay over plain HTTP (no TLS), and the relay
# forwards them to our Cloudflare HTTPS API. This fixes the device's inability to
# complete a TLS handshake directly with Cloudflare.
#
# RUN: open Windows PowerShell *as Administrator*, then paste this whole script.
# (Admin is needed to listen on the network port + add the firewall rule.)

$LISTEN_PORT = 9000
$TARGET = 'https://admin.rplmaheshwari.com/api/biometric/punch'
$USER   = 'rpl_biometric'
$PASS   = 'rI9Pgnres2LxmDNR3Tq0gDqU'
$LOG    = Join-Path $env:USERPROFILE 'timewatch-relay-log.txt'

# Use modern TLS for the outbound call to Cloudflare.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11

$basic = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(("{0}:{1}" -f $USER, $PASS)))

# Open the firewall for the listen port (best effort).
try {
  New-NetFirewallRule -DisplayName "TimeWatch Relay $LISTEN_PORT" -Direction Inbound -LocalPort $LISTEN_PORT -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
} catch {}

# Find this PC's LAN IP to show the URL for the device.
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' -or $_.IPAddress -like '172.*' } |
  Select-Object -First 1).IPAddress

function Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Write-Host $line
  try { Add-Content -Path $LOG -Value $line } catch {}
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$LISTEN_PORT/")
$listener.Start()

Write-Host "================ TimeWatch Relay ================" -ForegroundColor Cyan
Write-Host "Device 'API Config' URL me yeh daalo:" -ForegroundColor Yellow
Write-Host ("    http://{0}:{1}/" -f $ip, $LISTEN_PORT) -ForegroundColor Green
Write-Host ("Forwarding to : {0}" -f $TARGET)
Write-Host ("Log file      : {0}" -f $LOG)
Write-Host "Stop: is window ko close karo."
Write-Host "=================================================" -ForegroundColor Cyan
Log "Relay started on port $LISTEN_PORT"

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $reader = New-Object IO.StreamReader($req.InputStream, $req.ContentEncoding)
    $body = $reader.ReadToEnd(); $reader.Close()
    $ct = $req.ContentType; if (-not $ct) { $ct = 'application/json' }

    Log ("DEVICE {0} {1} ct={2} body={3}" -f $req.HttpMethod, $req.RawUrl, $ct, $body)

    if ($req.HttpMethod -eq 'POST' -and $body) {
      try {
        $r = Invoke-RestMethod -Uri $TARGET -Method POST -Headers @{ Authorization = $basic } -ContentType $ct -Body $body -TimeoutSec 20
        Log ("  -> Cloudflare OK: {0}" -f ($r | ConvertTo-Json -Compress -Depth 5))
      } catch {
        Log ("  -> forward FAILED: {0}" -f $_.Exception.Message)
      }
    }

    $out = [Text.Encoding]::UTF8.GetBytes('OK')
    $ctx.Response.StatusCode = 200
    $ctx.Response.ContentType = 'text/plain'
    $ctx.Response.OutputStream.Write($out, 0, $out.Length)
    $ctx.Response.Close()
  } catch {
    Log ("LISTENER ERROR: {0}" -f $_.Exception.Message)
  }
}
