# Dompet AI Server

Backend Express untuk webhook WhatsApp Cloud API.

## Setup

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Isi `.env`:

```env
PORT=4000
WHATSAPP_VERIFY_TOKEN=token-verifikasi-dari-kamu
WHATSAPP_ACCESS_TOKEN=token-whatsapp-cloud-api
WHATSAPP_PHONE_NUMBER_ID=id-nomor-whatsapp-cloud-api
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key
GEMINI_API_KEY=gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

## Endpoints

- `GET /health`
- `GET /webhook`
- `POST /webhook`
