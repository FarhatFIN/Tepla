# Tepla Messenger — Threat Model

## 1. Assets (что защищаем)

| Asset | Criticality | Location |
|---|---|---|
| Message content (plaintext) | CRITICAL | Client memory only (never on server) |
| Identity keys (Ed25519 private) | CRITICAL | Client IndexedDB + encrypted backup |
| Ratchet session state | HIGH | Client IndexedDB |
| Recovery phrase | CRITICAL | User's brain / physical backup |
| User metadata (who talks to whom) | HIGH | Server DB (partially mitigated by sealed sender) |
| Communication graph | HIGH | Server logs, DB foreign keys |
| Phone numbers / emails | MEDIUM | Server DB (registration) |
| Group membership | MEDIUM | Server DB |
| Message timestamps | LOW-MEDIUM | Server DB (batched delivery reduces precision) |
| File attachments (encrypted) | HIGH | S3/MinIO (server has ciphertext only) |

## 2. Adversaries

### 2.1 Passive Network Attacker
**Capability:** Observe all traffic between client and server.
**Mitigated by:** TLS 1.3 (all connections), certificate pinning (mobile).
**Residual risk:** Traffic analysis (message sizes, timing patterns).
**After padding + batching:** Can see that a user is active, but not content, not precise timing, not exact message size.

### 2.2 Active MITM
**Capability:** Intercept and modify traffic.

**Without Key Transparency:**
- Can substitute prekey bundles → impersonate any user
- Server is the MITM vector (it serves the bundles)
- CRITICAL vulnerability

**With Key Transparency:**
- Server cannot substitute keys without detection
- Merkle tree is append-only, client verifies inclusion proofs
- Split-view attacks detectable via STH consistency checks
- **Limitation:** TOFU on first contact — first-ever key fetch is trusted without proof history

### 2.3 Compromised Server
**Sees:**
- Encrypted message blobs (ciphertext)
- Recipient device IDs (sealed sender hides sender, not recipient)
- Message timestamps (±100ms due to batching)
- Communication graph (who delivers to which devices)
- Group membership
- User registration data (phone, email)
- Encrypted backup blobs (zero-knowledge — server cannot decrypt)
- Key Transparency log (public keys only, by design)

**Does NOT see:**
- Message plaintext (never leaves client unencrypted)
- Encryption keys (ratchet state is client-only)
- Sender identity in sealed sender messages (only recipient knows)
- Recovery phrases (never sent to server)
- Backup decryption keys (derived from phrase via Argon2id on client)

**Can do:**
- Drop messages (DoS) — detectable by delivery receipts
- Delay messages — detectable by timestamp comparison
- Replay old ciphertexts — rejected by ratchet counter + replay protection
- Serve stale prekey bundles — detectable by KT proof verification
- Return wrong device list — would cause decryption failures (detectable)

**Cannot do:**
- Read message content
- Forge messages (no sender's ratchet key)
- Decrypt old messages (forward secrecy via DH ratchet)
- Decrypt backup without recovery phrase

### 2.4 Compromised Recipient Device
**Sees:** All messages sent to that device (plaintext after decryption).
**Mitigated by:**
- Per-device ratchet sessions (compromising one device doesn't reveal other sessions)
- Device revocation (removes device from fan-out list)
- Message expiry (TTL-based auto-deletion)

**Cannot do:**
- Decrypt messages sent to user's OTHER devices (separate ratchet sessions)
- Recover messages deleted before compromise (forward secrecy)

**Limitation:** Messages received BEFORE revocation are exposed.

### 2.5 Government / Legal Request
**Server can provide:**
- Encrypted message blobs (useless without keys)
- Communication metadata (who communicated with whom, when, group membership)
- Registration data (phone, email, IP at registration)
- Encrypted backup blob (requires recovery phrase to decrypt)

**Server cannot provide:**
- Message plaintext
- Encryption keys
- Recovery phrase

**Honest assessment:** Metadata is the real risk. Communication graph + timestamps + group membership reveal significant information even without content.

## 3. Security Guarantees

### Forward Secrecy: ✓ (conditional)
Every message uses a unique message key derived from the ratchet chain.
DH ratchet steps generate new key material from fresh ephemeral keys.
**Condition:** Attacker must not have both parties' long-term identity keys AND a ratchet snapshot.
**After key compromise:** Forward secrecy is restored after the next DH ratchet step (1-2 messages).

### Post-Compromise Security: ✓ (conditional)
If a ratchet session key is compromised, security is restored after the next DH ratchet step.
The compromised party must send a message to trigger the DH ratchet.
**Condition:** The compromised device must still be in the attacker's control for less than one DH ratchet cycle.

### Deniability: ✓ (partial)
- Messages use symmetric keys (no digital signatures on content)
- Receiver could have forged any message they can decrypt
- **Limitation:** X3DH initial handshake involves identity key signatures — these provide cryptographic proof of participation (not content)

### Metadata Protection: PARTIAL
| Metadata | Protected? | Method |
|---|---|---|
| Message content | ✓ Full | E2EE (Double Ratchet) |
| Sender identity | ✓ From server | Sealed sender |
| Recipient identity | ✗ | Server routes by recipient_device_id |
| Message size | ✓ Partial | Bucket padding (256-16384 bytes) |
| Timing | ✓ Partial | 100ms delivery batching |
| Communication graph | ✗ | Server knows who is in which chat |
| Online status | ✗ | Presence service tracks this |
| Group membership | ✗ | Server manages groups |

## 4. Known Limitations — Without Prикрас

### Cannot protect without TEE (Trusted Execution Environment)
- **Server-side key transparency audit:** Without trusted hardware, the server can run a split-view attack against isolated clients. Full protection requires an independent auditor or TEE-based log.
- **Side-channel attacks:** JavaScript/WASM crypto is vulnerable to timing side channels. `libsodium` mitigates this partially with constant-time operations, but browser environment guarantees are weak.
- **Memory scraping:** Client keys in IndexedDB can be extracted by malware with filesystem access.

### Requires external auditor (Key Transparency)
- Current self-audit model trusts the server not to show different trees to different clients.
- **Path to full CT:** Publish signed tree heads to an independent append-only log (Trillian, or blockchain-backed). Third-party auditors mirror the log and flag inconsistencies.
- **Gossip protocol:** Clients can compare STH values out-of-band (QR code, shared chat) to detect split-view.

### Endpoint security is outside protocol scope
- Compromised OS or browser = game over for that device.
- Screen capture, accessibility API abuse, keyboard logging — all bypass E2EE.
- Rooted/jailbroken devices should be flagged but cannot be prevented.

### Metadata that still leaks
Even with all protections implemented:
1. **IP addresses** → server sees client IPs (mitigate: Tor/VPN, but not protocol-level)
2. **Active hours** → connection/disconnection times reveal user's schedule
3. **Group sizes** → observable via fan-out count
4. **Response timing** → even with batching, rapid back-and-forth reveals conversation pairs
5. **Push notification metadata** → FCM/APNS see device tokens and delivery timing

### Recovery phrase single point of failure
- Lost phrase = permanent loss of backup (by design — zero knowledge)
- Social engineering to obtain phrase = full key compromise
- No server-side recovery mechanism exists (by design)
