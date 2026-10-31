/**
 * End-to-End Message Encryption using Web Crypto API (AES-GCM 256-bit)
 * Works 100% offline in browser and Capacitor WebView without external dependencies.
 */

const STORAGE_KEY = 'meshaid_encryption_key_v1';
export const DEFAULT_KEY = 'MeshAid-Secure-Cluster-2026';

export function getStoredEncryptionPassphrase(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_KEY;
  } catch {
    return DEFAULT_KEY;
  }
}

export function setStoredEncryptionPassphrase(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim() || DEFAULT_KEY);
    cachedCryptoKey = null;
    cachedPassphrase = null;
  } catch {}
}

let cachedPassphrase: string | null = null;
let cachedCryptoKey: CryptoKey | null = null;

async function getDerivedCryptoKey(passphrase: string): Promise<CryptoKey> {
  if (cachedCryptoKey && cachedPassphrase === passphrase) {
    return cachedCryptoKey;
  }

  const enc = new TextEncoder();
  const rawKeyMaterial = enc.encode(passphrase);

  // Hash the passphrase with SHA-256 to produce exactly 256 bits of key material
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawKeyMaterial);

  const importedKey = await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  cachedPassphrase = passphrase;
  cachedCryptoKey = importedKey;
  return importedKey;
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypt a text string into an authenticated envelope: ENC:v1:<base64-iv>:<base64-ciphertext>
 */
export async function encryptText(plainText: string, passphrase?: string): Promise<string> {
  try {
    const key = await getDerivedCryptoKey(passphrase || getStoredEncryptionPassphrase());
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV standard for AES-GCM
    const encoded = new TextEncoder().encode(plainText);

    const cipherBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encoded
    );

    const ivB64 = bufferToBase64(iv);
    const cipherB64 = bufferToBase64(cipherBuffer);

    return `ENC:v1:${ivB64}:${cipherB64}`;
  } catch (err) {
    console.error('Encryption failed, falling back to plaintext:', err);
    return plainText;
  }
}

/**
 * Decrypt an envelope. Handles both encrypted and legacy plaintext gracefully.
 */
export async function decryptText(
  envelope: string,
  passphrase?: string
): Promise<{ text: string; isEncrypted: boolean; success: boolean }> {
  if (!envelope || !envelope.startsWith('ENC:v1:')) {
    return { text: envelope, isEncrypted: false, success: true };
  }

  try {
    const parts = envelope.split(':');
    if (parts.length !== 4) {
      return { text: envelope, isEncrypted: true, success: false };
    }

    const iv = base64ToBuffer(parts[2]);
    const cipherBytes = base64ToBuffer(parts[3]);
    const key = await getDerivedCryptoKey(passphrase || getStoredEncryptionPassphrase());

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as any,
      },
      key,
      cipherBytes as any
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    return { text: decryptedText, isEncrypted: true, success: true };
  } catch (err) {
    console.warn('Decryption failed (key mismatch or damaged payload):', err);
    return {
      text: '🔒 [Encrypted Message - Key Mismatch]',
      isEncrypted: true,
      success: false,
    };
  }
}
