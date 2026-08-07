<?php
/**
 * Meta Conversions API (CAPI) — Server-Side Event Relay
 * Open Soluções Tributárias
 * 
 * Receives Lead events from frontend forms and relays them
 * to Meta's Conversions API for server-side tracking.
 * Deduplication is handled via event_id (shared with fbq pixel).
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// === CONFIGURATION ===
$PIXEL_ID     = '549971842334998';
$ACCESS_TOKEN = 'EAAI4lFyj0psBSDFqjxj4mNRtJLItqm4CSDHt7mx2Wdho65SCrAQicpdKl0yYCpZBFWrzwvxz24lueiV4VMSVFG3ZAZC1ZBarKMKo0IMNyR2G2OlReX2IF8VZCMmXAUW3mAp0erF96SQSmkeNBSeELNbnFhdZCQnUsqFS3uoAzOz1DnRfXKcI1UKakvx0MNdgZDZD';
$API_VERSION  = 'v21.0';

// === READ INPUT ===
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['event_name'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing event_name']);
    exit;
}

// === BUILD USER DATA ===
$userData = [];

if (!empty($input['email'])) {
    $userData['em'] = [hash('sha256', strtolower(trim($input['email'])))];
}

if (!empty($input['phone'])) {
    $phone = preg_replace('/\D/', '', $input['phone']);
    // Ensure Brazilian country code
    if (strlen($phone) <= 11) {
        $phone = '55' . $phone;
    }
    $userData['ph'] = [hash('sha256', $phone)];
}

if (!empty($input['name'])) {
    $nameParts = explode(' ', trim($input['name']));
    $userData['fn'] = [hash('sha256', strtolower($nameParts[0]))];
    if (count($nameParts) > 1) {
        $userData['ln'] = [hash('sha256', strtolower(end($nameParts)))];
    }
}

if (!empty($input['fbp'])) {
    $userData['fbp'] = $input['fbp'];
}

if (!empty($input['fbc'])) {
    $userData['fbc'] = $input['fbc'];
}

// Client IP and User Agent (from server)
$userData['client_ip_address'] = $_SERVER['REMOTE_ADDR'] ?? null;
$userData['client_user_agent'] = $_SERVER['HTTP_USER_AGENT'] ?? null;

// === BUILD EVENT ===
$event = [
    'event_name'    => $input['event_name'],
    'event_time'    => time(),
    'action_source' => 'website',
    'user_data'     => $userData,
];

if (!empty($input['event_id'])) {
    $event['event_id'] = $input['event_id'];
}

if (!empty($input['event_source_url'])) {
    $event['event_source_url'] = $input['event_source_url'];
}

// === SEND TO META ===
$url = "https://graph.facebook.com/{$API_VERSION}/{$PIXEL_ID}/events?access_token={$ACCESS_TOKEN}";

$payload = json_encode([
    'data' => [$event],
]);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// === RESPONSE ===
if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'CAPI request failed', 'detail' => $curlError]);
} else {
    http_response_code($httpCode === 200 ? 200 : 502);
    echo $response;
}
