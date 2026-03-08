"""
Generates docs/data/example_quiz.bsq — an encrypted BrainStuffer quiz file.
Password: brainstuffer

Uses the same algorithm as the browser (PBKDF2-SHA256 + AES-GCM 256-bit).
Run: python create_example_bsq.py
"""
import json, os, base64
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

PASSWORD  = "brainstuffer"
OUT_FILE  = "docs/data/example_quiz.bsq"

QUESTIONS = [
    {
        "question_id": 1,
        "question": "What does AES stand for?",
        "answers": [
            "Advanced Encryption Standard",
            "Automatic Encryption System",
            "Applied Encryption Standard",
            "Advanced Encoding Scheme"
        ]
    },
    {
        "question_id": 2,
        "question": "Which mode of AES provides authenticated encryption?",
        "answers": [
            "GCM",
            "ECB",
            "CBC",
            "CFB"
        ]
    },
    {
        "question_id": 3,
        "question": "What key derivation function is used to turn a password into an AES key?",
        "answers": [
            "PBKDF2",
            "MD5",
            "SHA-1",
            "Base64"
        ]
    },
    {
        "question_id": 4,
        "question": "What is the purpose of a salt in password-based encryption?",
        "answers": [
            "Prevents identical passwords producing the same key",
            "Makes the password longer",
            "Speeds up decryption",
            "Replaces the IV"
        ]
    },
    {
        "question_id": 5,
        "question": "How many bits is the AES key used in BrainStuffer .bsq files?",
        "answers": [
            "256",
            "128",
            "512",
            "64"
        ]
    }
]

def encrypt(plaintext: str, password: str) -> str:
    salt = os.urandom(16)
    iv   = os.urandom(12)

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=200000,
    )
    key = kdf.derive(password.encode())

    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(iv, plaintext.encode(), None)

    return json.dumps({
        "v":    1,
        "salt": base64.b64encode(salt).decode(),
        "iv":   base64.b64encode(iv).decode(),
        "data": base64.b64encode(ct).decode()
    })

plaintext = json.dumps(QUESTIONS, ensure_ascii=False)
encrypted = encrypt(plaintext, PASSWORD)

with open(OUT_FILE, "w", encoding="utf-8") as f:
    f.write(encrypted)

print(f"Created {OUT_FILE}")
print(f"Password: {PASSWORD}")
print(f"Questions: {len(QUESTIONS)}")
