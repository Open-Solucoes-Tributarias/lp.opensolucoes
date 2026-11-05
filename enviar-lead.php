<?php
/**
 * Envio de leads por e-mail — Open Soluções Tributárias
 *
 * Recebe o formulário das LPs (JSON via POST) e encaminha por e-mail para
 * a equipe responsável. Complementa o envio ao RD Station feito no front.
 *
 * Para adicionar uma nova LP: incluir uma entrada em $DESTINOS.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$ORIGENS_PERMITIDAS = [
    'https://lp.opensolucoestributarias.com.br',
    'https://pagina.opensolucoestributarias.com.br',
];

if (!empty($_SERVER['HTTP_ORIGIN'])) {
    if (in_array($_SERVER['HTTP_ORIGIN'], $ORIGENS_PERMITIDAS, true)) {
        header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

// === CONFIGURAÇÃO ===
// Chave = identificador enviado pela LP; valor = destinatário(s) e assunto.
$DESTINOS = [
    'diagnostico-tributario-assespro' => [
        'to'      => 'soraya.sa@opensolucoestributarias.com.br',
        'subject' => 'Novo lead — Diagnóstico Tributário Assespro',
    ],
];
$REMETENTE = 'no-reply@opensolucoestributarias.com.br';

// === ENTRADA ===
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'JSON inválido']);
    exit;
}

// Honeypot: campo invisível que só robôs preenchem. Responde ok sem enviar.
if (!empty($input['website'])) {
    echo json_encode(['ok' => true]);
    exit;
}

$form = isset($input['form']) ? (string) $input['form'] : '';
if (!isset($DESTINOS[$form])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Formulário desconhecido']);
    exit;
}

// Remove quebras de linha (evita injeção de cabeçalho) e limita o tamanho.
function limpar($valor, $max = 200) {
    $valor = is_scalar($valor) ? (string) $valor : '';
    $valor = preg_replace('/[\r\n\t]+/', ' ', $valor);
    return trim(mb_substr($valor, 0, $max, 'UTF-8'));
}

$nome    = limpar(isset($input['name']) ? $input['name'] : '');
$email   = limpar(isset($input['email']) ? $input['email'] : '', 254);
$empresa = limpar(isset($input['company']) ? $input['company'] : '');
$regime  = limpar(isset($input['regime']) ? $input['regime'] : '');
$fone    = limpar(isset($input['phone']) ? $input['phone'] : '', 30);

if (mb_strlen($nome, 'UTF-8') < 3 || !filter_var($email, FILTER_VALIDATE_EMAIL)
    || $empresa === '' || $regime === '' || ($fone !== '' && strlen(preg_replace('/\D/', '', $fone)) < 10)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Dados inválidos']);
    exit;
}

$origem = [];
foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as $chave) {
    $valor = limpar(isset($input[$chave]) ? $input[$chave] : '');
    if ($valor !== '') {
        $origem[] = $chave . ': ' . $valor;
    }
}

date_default_timezone_set('America/Bahia');
$pagina = limpar(isset($input['page']) ? $input['page'] : '', 300);
$dataHora = date('d/m/Y H:i');
$foneDigitos = preg_replace('/\D/', '', $fone);
$linkWhats = $foneDigitos !== '' ? 'https://wa.me/55' . $foneDigitos : '';

function h($texto) {
    return htmlspecialchars($texto, ENT_QUOTES, 'UTF-8');
}

// Linhas da tabela de dados: [rótulo, texto, link opcional]
$campos = [
    ['Nome', $nome, null],
    ['E-mail', $email, 'mailto:' . $email],
    ['WhatsApp', $fone !== '' ? $fone : 'Não informado', $linkWhats !== '' ? $linkWhats : null],
    ['Empresa', $empresa, null],
    ['Regime tributário', $regime, null],
];

// --- Versão texto (fallback) ---
$linhas = ['NOVO LEAD — Diagnóstico Tributário Assespro', str_repeat('-', 44)];
foreach ($campos as $c) {
    $linhas[] = $c[0] . ': ' . $c[1];
}
$linhas[] = '';
$linhas[] = 'Recebido em: ' . $dataHora;
if ($pagina !== '') {
    $linhas[] = 'Página: ' . $pagina;
}
if ($origem) {
    $linhas[] = '';
    $linhas[] = 'Origem do tráfego:';
    foreach ($origem as $linha) {
        $linhas[] = '  ' . $linha;
    }
}
$texto = implode("\r\n", $linhas);

// --- Versão HTML (tabelas + estilos inline, compatível com Outlook/Gmail) ---
$linhasHtml = '';
foreach ($campos as $c) {
    $valor = h($c[1]);
    if ($c[2]) {
        $valor = '<a href="' . h($c[2]) . '" style="color:#1D61DC;text-decoration:none;font-weight:600;">' . $valor . '</a>';
    } else {
        $valor = '<strong>' . $valor . '</strong>';
    }
    $linhasHtml .= '<tr>'
        . '<td style="padding:12px 0;border-bottom:1px solid #E4E4EC;width:38%;font-size:13px;color:#8a8a96;text-transform:uppercase;letter-spacing:.04em;vertical-align:top;">' . h($c[0]) . '</td>'
        . '<td style="padding:12px 0;border-bottom:1px solid #E4E4EC;font-size:16px;color:#1b1b28;">' . $valor . '</td>'
        . '</tr>';
}

$origemHtml = '';
if ($origem) {
    $itens = '';
    foreach ($origem as $linha) {
        $itens .= '<div style="font-size:13px;color:#63636E;padding:2px 0;">' . h($linha) . '</div>';
    }
    $origemHtml = '<div style="margin-top:22px;padding:14px 16px;background:#F4F2F0;border-radius:8px;">'
        . '<div style="font-size:12px;font-weight:700;color:#434351;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Origem do tráfego</div>'
        . $itens . '</div>';
}

$paginaHtml = $pagina !== ''
    ? '<div style="font-size:12px;color:#8a8a96;margin-top:6px;word-break:break-all;">Página: ' . h($pagina) . '</div>'
    : '';

$botaoWhats = $linkWhats !== ''
    ? '<td style="background:#25D366;border-radius:999px;"><a href="' . h($linkWhats) . '" style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">Chamar no WhatsApp</a></td><td width="10"></td>'
    : '';

$html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
    . '<body style="margin:0;padding:0;background:#EEF0F5;font-family:Arial,Helvetica,sans-serif;">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF0F5;padding:24px 12px;"><tr><td align="center">'
    . '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">'
    . '<tr><td style="background:#030D2F;padding:26px 32px;">'
    . '<div style="font-size:12px;letter-spacing:.14em;color:#68D0FA;font-weight:700;text-transform:uppercase;">Novo lead</div>'
    . '<div style="font-size:22px;line-height:1.25;color:#ffffff;font-weight:700;margin-top:6px;">Diagnóstico Tributário · Assespro</div>'
    . '</td></tr>'
    . '<tr><td style="padding:28px 32px 8px;">'
    . '<p style="margin:0 0 14px;font-size:15px;color:#434351;line-height:1.5;"><strong>' . h($nome) . '</strong> preencheu o formulário e aguarda contato.</p>'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $linhasHtml . '</table>'
    . '<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr>'
    . $botaoWhats
    . '<td style="background:#1D61DC;border-radius:999px;"><a href="mailto:' . h($email) . '" style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">Responder por e-mail</a></td>'
    . '</tr></table>'
    . $origemHtml
    . '</td></tr>'
    . '<tr><td style="padding:20px 32px 28px;">'
    . '<div style="font-size:12px;color:#8a8a96;border-top:1px solid #E4E4EC;padding-top:14px;">Recebido em ' . h($dataHora) . '</div>'
    . $paginaHtml
    . '</td></tr></table>'
    . '<div style="font-size:11px;color:#9aa0b4;margin-top:14px;">Open Soluções Tributárias</div>'
    . '</td></tr></table></body></html>';

$destino = $DESTINOS[$form];
$assunto = '=?UTF-8?B?' . base64_encode($destino['subject'] . ' — ' . $nome) . '?=';
$limite = 'b' . md5(uniqid('', true));
$cabecalhos = [
    'From: Open Soluções Tributárias <' . $REMETENTE . '>',
    // Nome já sem quebras de linha; remove também aspas e <> do cabeçalho.
    'Reply-To: ' . str_replace(['"', '<', '>'], '', $nome) . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' . $limite . '"',
];

$corpo = '--' . $limite . "\r\n"
    . "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
    . chunk_split(base64_encode($texto)) . "\r\n"
    . '--' . $limite . "\r\n"
    . "Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
    . chunk_split(base64_encode($html)) . "\r\n"
    . '--' . $limite . '--';

$enviado = mail($destino['to'], $assunto, $corpo, implode("\r\n", $cabecalhos));

if (!$enviado) {
    error_log('[enviar-lead] mail() falhou para o formulário ' . $form);
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Falha ao enviar e-mail']);
    exit;
}

echo json_encode(['ok' => true]);
