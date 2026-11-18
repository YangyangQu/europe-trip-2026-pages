#!/usr/bin/env node
// Update the encrypted web page offline: node reencrypt.mjs /path/to/updated.html
import {readFileSync,writeFileSync} from 'node:fs';
import {randomBytes,pbkdf2Sync,createCipheriv} from 'node:crypto';
import {createInterface} from 'node:readline';
if(!process.argv[2]){console.error('Usage: node reencrypt.mjs /path/to/updated.html');process.exit(1)}
const rl=createInterface({input:process.stdin,output:process.stdout});
function ask(s){return new Promise(resolve=>rl.question(s,resolve))}
const password=await ask('输入已有网页密码（输入时会显示；注意周围环境）：');rl.close();
if(!password){console.error('密码不可为空');process.exit(1)}
const salt=randomBytes(16),nonce=randomBytes(12),iterations=350000;
const key=pbkdf2Sync(Buffer.from(password,'utf8'),salt,iterations,32,'sha256');
const cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(Buffer.from('budapest-trip-v1','utf8'));
const src=readFileSync(process.argv[2]);
const out=Buffer.concat([cipher.update(src),cipher.final(),cipher.getAuthTag()]);
const enc={version:1,type:'aes-256-gcm',kdf:'pbkdf2-sha256',iterations,salt:salt.toString('base64'),nonce:nonce.toString('base64'),aad:'budapest-trip-v1',ciphertext:out.toString('base64')};
writeFileSync(new URL('./data.locked.json',import.meta.url),JSON.stringify(enc));
console.log('Encrypted: data.locked.json. Commit only this encrypted file; do NOT commit the original HTML or password.');
