<?php
/**
 * RPL biometric receiver — runs on Hostinger (NOT Cloudflare).
 *
 * The TimeWatch device posts punches here. Because this is a plain server
 * (no Cloudflare strict-TLS / SNI requirement), the device can reach it over
 * HTTP or simple HTTPS. We then forward each punch to the Cloudflare portal API.
 *
 * Upload as e.g. public_html/biometric.php and point the device "API Config"
 * Url to:  http://<your-hostinger-domain>/biometric.php
 */

$TARGET = 'https://admin.rplmaheshwari.com/api/biometric/punch';
$USER   = 'rpl_biometric';
$PASS   = 'rI9Pgnres2LxmDNR3Tq0gDqU';
$LOG    = __DIR__ . '/biometric-log.txt';

$method = $_SERVER['REQUEST_METHOD'];
$body   = file_get_contents('php://input');
$ct     = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : 'application/json';

// Log every hit so we can inspect the device's exact format.
@file_put_contents(
  $LOG,
  '[' . date('Y-m-d H:i:s') . "] $method  ct=$ct  body=$body\n",
  FILE_APPEND
);

// Forward POSTs to the Cloudflare portal API (Hostinger has modern TLS, so this works).
if ($method === 'POST' && $body !== '') {
  $ch = curl_init($TARGET);
  curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_HTTPHEADER     => [
      'Content-Type: ' . $ct,
      'Authorization: Basic ' . base64_encode($USER . ':' . $PASS),
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 20,
  ]);
  $resp = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err  = curl_error($ch);
  curl_close($ch);
  @file_put_contents(
    $LOG,
    "  -> Cloudflare HTTP $code $err " . substr((string)$resp, 0, 200) . "\n",
    FILE_APPEND
  );
}

// Always reply 200 OK to the device.
http_response_code(200);
header('Content-Type: text/plain');
echo 'OK';
