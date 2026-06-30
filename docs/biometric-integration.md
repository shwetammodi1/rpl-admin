# RPL Maheshwari — Biometric Integration Guide

How a TimeWatch biometric device sends attendance punches into the RPL portal.

---

## 1. Overview

The portal exposes a **webhook API** that accepts punch records and stores them as
attendance. There are **two ways** the device's data can reach it:

```
(A) Direct:   Device ─HTTPS─▶  https://admin.rplmaheshwari.com/api/biometric/punch  (Cloudflare)
(B) Relay:    Device ─HTTPS─▶  https://palegreen-meerkat-171902.hostingersite.com/biometric.php  (Hostinger)
                                        └─ forwards to the Cloudflare API above
```

- **(A) Direct** is the cleanest, but the device must be able to negotiate **modern TLS (1.2+) with SNI**, which Cloudflare requires. Older device firmware that can't do this fails silently (no request ever reaches the server).
- **(B) Relay** exists because Hostinger is a plain server with lenient TLS. The device posts there; the Hostinger script forwards the exact body to the Cloudflare API. Use this if the device can't talk to Cloudflare directly.

Either way the **payload format is the same** — only the URL differs.

---

## 2. Endpoints

| Purpose | Method | URL |
|---|---|---|
| Single punch (direct) | `POST` | `https://admin.rplmaheshwari.com/api/biometric/punch` |
| Many punches / bulk (direct) | `POST` | `https://admin.rplmaheshwari.com/api/biometric/sync` |
| Relay (Hostinger) | `POST` | `https://palegreen-meerkat-171902.hostingersite.com/biometric.php` |

---

## 3. Authentication

HTTP **Basic Auth** on every request:

```
Username: rpl_biometric
Password: __BIOMETRIC_PASSWORD__
```

This produces the header:
```
Authorization: Basic <base64 of rpl_biometric:PASSWORD>
Content-Type: application/json
```

> **Note:** the real password is intentionally not committed to the repo. It is
> `__BIOMETRIC_PASSWORD__` above — substitute the actual value (held by the RPL admin /
> in the device config) before sharing with the vendor.

> The Hostinger relay ignores whatever auth the device sends and re-applies the
> correct Basic Auth when forwarding to Cloudflare — so for the relay URL the
> device's username/password don't matter.

---

## 4. Payload — single punch

`POST /api/biometric/punch`

```json
{
  "deviceId": "TW30000004250406",
  "ref": "102",
  "punchTime": "2026-06-30 09:15:00",
  "direction": "in"
}
```

## 5. Payload — multiple punches (bulk)

`POST /api/biometric/sync`

```json
{
  "deviceId": "TW30000004250406",
  "punches": [
    { "ref": "102", "punchTime": "2026-06-30 09:15:00", "direction": "in" },
    { "ref": "102", "punchTime": "2026-06-30 17:30:00", "direction": "out" },
    { "ref": "105", "punchTime": "2026-06-30 09:20:00", "direction": "in" }
  ]
}
```

---

## 6. Field reference

| Field | Meaning | Required | Accepted alternative names |
|---|---|---|---|
| `ref` | Employee **Pay Code / enroll number** (e.g. `102`) | **Yes** | `biometricRef`, `userId`, `EmployeeCode`, `empCode`, `pin`, `enrollId`, `EnrollNumber` |
| `punchTime` | Punch timestamp | **Yes** | `PunchTime`, `punch_time`, `LogDate`, `LogDateTime`, `AttDateTime`, `DateTime`, `dateTime`, `EventTime`, `time`, `datetime` |
| `direction` | In / Out | Optional | `Direction`, `InOut`, `inout`, `in_out`, `status`, `Status`, `C1`, `io`, `type` |
| `deviceId` | Device serial | Optional | `serial`, `SN`, `DeviceSerialNo` |
| (bulk array) | List of punches | for `/sync` | `punches`, `data`, `records`, `logs`, `AttendanceLogs`, `Table` |

The parser is **tolerant** — any of the alternative names above work, so an existing
device format will likely be accepted as-is.

### `punchTime` accepted formats
- `"YYYY-MM-DD HH:MM:SS"` (IST) — e.g. `2026-06-30 09:15:00`
- Epoch milliseconds — e.g. `1782312900000`
- Epoch seconds — e.g. `1782312900`

### `direction` values
- In: `in`, `I`, `0`, `checkin`
- Out: `out`, `O`, `1`, `checkout`

---

## 7. Response

On success the API returns HTTP **200**:
```json
{ "ok": true }
```
Bulk endpoint returns counts:
```json
{ "accepted": 3, "duplicates": 0 }
```
Wrong credentials → HTTP **401** `{"error":"Invalid device credentials"}`.

Duplicate punches (same device + ref + time) are ignored automatically (safe to resend).

---

## 8. Test examples

**cURL — single punch:**
```bash
curl -X POST "https://admin.rplmaheshwari.com/api/biometric/punch" \
  -u "rpl_biometric:__BIOMETRIC_PASSWORD__" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"TW30000004250406","ref":"102","punchTime":"2026-06-30 09:15:00","direction":"in"}'
```

**Postman:**
- Method `POST`, URL as above
- Authorization → Basic Auth → username `rpl_biometric`, password `__BIOMETRIC_PASSWORD__`
- Body → raw → JSON → paste the single-punch payload
- Expected: `200 OK` `{"ok":true}`

---

## 9. Device "API Config" settings (TimeWatch)

| Field | Value |
|---|---|
| Enable | ✅ on |
| Url | one of the endpoints in section 2 |
| UserName | `rpl_biometric` |
| Password | `__BIOMETRIC_PASSWORD__` |
| CheckDataInterval | `1` (minutes) |

---

## 10. Known constraint (important)

The device must be able to **reach the URL and complete its TLS handshake**:

- Cloudflare (`admin.rplmaheshwari.com`) **requires** modern TLS 1.2/1.3 + SNI. If the
  device firmware has an old TLS stack, the connection is dropped **before** it becomes
  an HTTP request → nothing reaches the server, with **no error logged**.
- The Hostinger relay was added for this reason (lenient TLS). It still serves HTTPS only.
- The device also needs **internet access** (correct gateway + DNS) to reach any public URL.

**Vendor checklist if no data arrives:**
1. Confirm the device firmware can `POST` to a **custom HTTPS URL** (not only the TimeWatch cloud).
2. Confirm it supports **TLS 1.2**.
3. Confirm the device has **internet** (gateway + DNS), not just LAN.
4. Confirm the exact **payload format** the device sends (so it can be mapped to the fields above).

---

## 11. Fallback that already works (no live push needed)

If live push can't be made to work device-side, attendance is still loaded reliably via
**CSV import** in the portal:

- TimeWatch desktop → **Reports → Daily Reports → "Machine Raw Punch All"** → Export to Excel → Save As CSV.
- Portal (HR/Master) → **Import Attendance** → upload the CSV. Duplicates are skipped.

---

*Endpoint, credentials and Hostinger URL are environment-specific to RPL Maheshwari College.*
