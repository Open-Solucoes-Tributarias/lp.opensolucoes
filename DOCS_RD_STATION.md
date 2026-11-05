# 🔌 Especificação Técnica & Guia de Integração: RD Station Marketing (API 1.3)

Esta documentação serve como **manual de referência universal** para integrar qualquer sistema (Landing Pages, Webhooks, Backends em PHP/Python/Node.js, CRMs ou Apps) com o **RD Station Marketing** utilizando a **API 1.3 de Conversões**.

---

## 📌 1. Visão Geral da API

A API de Conversões 1.3 do RD Station permite registrar interações de leads (como preenchimento de formulários, solicitações de contato, downloads ou compras) diretamente na base de contatos do RD Station.

* **URL de Produção**: `https://www.rdstation.com.br/api/1.3/conversions`
* **Método HTTP**: `POST`
* **Cabeçalhos (Headers)**:
  * `Content-Type: application/json`
  * `Accept: application/json`
* **Autenticação**: Via token público no corpo da requisição (`token_rdstation`).

---

## 🔑 2. Credenciais e Conceitos Básicos

### `token_rdstation` (Token Público da Conta)
* É a chave pública que identifica a sua **conta de empresa** no RD Station.
* **Token desta Conta**: `fde56b5029b7f481d3f10fecb3f1de85` *(Onde encontrar no painel: Configurações > Integrações > Token Público)*.
* **Regra**: Este token é fixo para todas as Landing Pages e sistemas conectados à mesma conta do RD Station.

### `identificador` (Nome da Conversão)
* Nome/ID único que categoriza o evento de conversão específico (ex: `lp-reforma-tributaria`, `checkout-curso-x`, `formulario-contato-site`).
* **Regra**: Você pode definir qualquer string alfanumérica. **Não precisa pré-cadastrar no RD Station**. A plataforma cria o evento automaticamente no primeiro envio.

---

## 📦 3. Schema Completo do Payload (JSON)

### Campos Obrigatórios

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `token_rdstation` | `string` | Token público da conta no RD Station. |
| `identificador` | `string` | Nome do evento de conversão / formulário. |
| `email` | `string` | E-mail do lead (Chave primária única no RD Station). |

### Campos Padrão Recomendados

| Campo | Tipo | Descrição / Exemplo |
| :--- | :--- | :--- |
| `name` | `string` | Nome completo do Lead (`"João Silva"`). |
| `mobile_phone` ou `phone` | `string` | Telefone/WhatsApp com DDD (`"11999999999"`). |
| `job_title` | `string` | Cargo do Lead (`"Gerente Fiscal"`). |
| `company_name` | `string` | Nome da empresa (`"Empresa XYZ"`). |
| `state` | `string` | Estado / UF (`"SP"`). |
| `city` | `string` | Cidade (`"São Paulo"`). |

### Campos de Atribuição e Origem (UTMs)

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `traffic_source` | `string` | Origem do tráfego / `utm_source` (ex: `google`, `facebook`). |
| `traffic_medium` | `string` | Meio do tráfego / `utm_medium` (ex: `cpc`, `organic`, `email`). |
| `traffic_campaign` | `string` | Nome da campanha / `utm_campaign` (ex: `campanha-lancamento`). |
| `traffic_value` | `string` | Termo de busca / `utm_term` (ex: `curso-tributario`). |
| `traffic_content` | `string` | Conteúdo do anúncio / `utm_content` (ex: `anuncio-banner-1`). |
| `cf_utm_placement` | `string` | Posicionamento do anúncio / `utm_placement`. |

### Campos Personalizados (`cf_*`)

* Qualquer campo extra que não seja nativo do RD Station **deve obrigatoriamente usar o prefixo `cf_`** (Custom Field).
* **Exemplo**: `cf_setor`, `cf_faturamento_anual`, `cf_numero_funcionarios`.
* **Requisito no RD Station**: Para o dado ser exibido corretamente no perfil do Lead, a chave da API (ex: `setor`) precisa estar previamente cadastrada em **Configurações > Campos Personalizados** dentro do painel do RD Station.

---

## 🛠️ 4. Regras de Negócio e Boas Práticas (Multi-Sistema)

### 🧹 1. Sanitização e Limpeza de Dados (OBRIGATÓRIO)
O RD Station sobrescreve os dados do Lead caso você envie valores vazios. Portanto, qualquer sistema integrador **DEVE remover chaves que contenham valores nulos, vazios ou indefinidos antes de enviar a requisição**.

```text
Entrada bruta:   { "name": "João", "email": "j@test.com", "company_name": "" }
Payload limpo:   { "name": "João", "email": "j@test.com" }
```

### ✉️ 2. Normalização de E-mail
Sempre aplique `.trim().toLowerCase()` no e-mail antes do envio para evitar duplicidades na base por conta de letras maiúsculas ou espaços acidentais.

### 🛡️ 3. Resiliência e Fallback
Se o disparo for executado no cliente (Frontend/Browser), sempre trate a promessa HTTP para que uma hipotética lentidão ou bloqueador de anúncios (AdBlock) não impeça o usuário de avançar na tela (exibir sucesso de qualquer forma).

---

## 💻 5. Exemplos de Implementação para Outros Sistemas

### 1️⃣ cURL (HTTP Direto / CLI)

```bash
curl -X POST "https://www.rdstation.com.br/api/1.3/conversions" \
  -H "Content-Type: application/json" \
  -d '{
    "token_rdstation": "fde56b5029b7f481d3f10fecb3f1de85",
    "identificador": "conversao-sistema-externo",
    "name": "Carlos Andrade",
    "email": "carlos@exemplo.com.br",
    "mobile_phone": "11988887777",
    "traffic_source": "integracao-api"
  }'
```

### 2️⃣ PHP (Backend / cURL)

```php
<?php
function enviarLeadRDStation($dados) {
    $token = 'fde56b5029b7f481d3f10fecb3f1de85';
    
    $payload = array_filter([
        'token_rdstation'  => $token,
        'identificador'    => $dados['identificador'],
        'name'             => $dados['nome'] ?? null,
        'email'            => strtolower(trim($dados['email'])),
        'mobile_phone'     => $dados['telefone'] ?? null,
        'traffic_source'   => $dados['utm_source'] ?? null,
        'traffic_medium'   => $dados['utm_medium'] ?? null,
        'traffic_campaign' => $dados['utm_campaign'] ?? null,
    ], fn($value) => !is_null($value) && $value !== '');

    $ch = curl_init('https://www.rdstation.com.br/api/1.3/conversions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return $httpCode >= 200 && $httpCode < 300;
}
```

### 3️⃣ Python (Backend / Requests)

```python
import requests

def enviar_lead_rdstation(identificador, email, nome=None, telefone=None, **kwargs):
    url = "https://www.rdstation.com.br/api/1.3/conversions"
    
    payload = {
        "token_rdstation": "fde56b5029b7f481d3f10fecb3f1de85",
        "identificador": identificador,
        "email": email.strip().lower(),
        "name": nome,
        "mobile_phone": telefone,
    }
    
    # Adiciona campos extras/UTMs
    payload.update(kwargs)
    
    # Sanitização: remove chaves vazias ou None
    payload_limpo = {k: v for k, v in payload.items() if v is not None and v != ""}
    
    response = requests.post(url, json=payload_limpo, headers={"Content-Type": "application/json"})
    return response.status_code == 200
```

### 4️⃣ JavaScript / Node.js (Fetch API)

```javascript
async function sendRdLead(data) {
  const payload = {
    token_rdstation: 'fde56b5029b7f481d3f10fecb3f1de85',
    identificador: data.identificador,
    name: data.name,
    email: data.email?.trim().toLowerCase(),
    mobile_phone: data.phone,
    traffic_source: data.utm_source,
    traffic_medium: data.utm_medium,
    traffic_campaign: data.utm_campaign
  };

  // Higienização
  Object.keys(payload).forEach(key => {
    if (payload[key] === undefined || payload[key] === null || payload[key] === '') {
      delete payload[key];
    }
  });

  const response = await fetch('https://www.rdstation.com.br/api/1.3/conversions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return response.ok;
}
```

---

## 📊 6. Comportamento no Painel do RD Station

1. **Auto-registro de Conversão**: A conversão aparece na timeline do Lead sob o nome configurado no campo `identificador`.
2. **Gatilhos em Automação**: No RD Station, acesse **Relacionar > Automação de Marketing**, crie um fluxo e selecione o gatilho *"Realizou a conversão [nome-do-identificador]"*.
3. **Segmentação**: Em **Relacionar > Segmentação de Leads**, você pode filtrar contatos que converteram especificamente nesse evento.
