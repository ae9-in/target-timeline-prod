import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

let cachedPrivateKey: string | null = null;
let cachedPublicKey: string | null = null;

export function getJwtKeys(): { privateKey: string; publicKey: string } {
  if (cachedPrivateKey && cachedPublicKey) {
    return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey };
  }

  const envPrivate = process.env.JWT_PRIVATE_KEY;
  const envPublic = process.env.JWT_PUBLIC_KEY;

  if (envPrivate && envPublic && envPrivate.trim() !== '' && envPrivate.includes('PRIVATE KEY')) {
    cachedPrivateKey = envPrivate.replace(/\\n/g, '\n');
    cachedPublicKey = envPublic.replace(/\\n/g, '\n');
    return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey };
  }

  const privateKeyPath = path.join(process.cwd(), 'jwt.key');
  const publicKeyPath = path.join(process.cwd(), 'jwt.key.pub');

  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    cachedPrivateKey = fs.readFileSync(privateKeyPath, 'utf8');
    cachedPublicKey = fs.readFileSync(publicKeyPath, 'utf8');
    return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey };
  }

  console.log('JWT keys not found. Generating fresh 2048-bit RSA key pair for development...');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },
  });

  try {
    fs.writeFileSync(privateKeyPath, privateKey);
    fs.writeFileSync(publicKeyPath, publicKey);
    console.log(`RSA Key Pair generated and saved to ${privateKeyPath} and ${publicKeyPath}`);
  } catch (err) {
    console.warn('Failed to write generated JWT keys to disk, caching in memory only.', err);
  }

  cachedPrivateKey = privateKey;
  cachedPublicKey = publicKey;

  return { privateKey, publicKey };
}
