# Edith — Setup Guide (Hinglish)

## Kya hai ye project?
Node.js + Express backend jo:
- Signup/Login system rakhta hai (users file mein save hote hain, passwords hash hoke)
- Login ke baad hi chat AI (Google Gemini) use kar sakte ho
- API key hamesha server pe rehti hai, browser mein kabhi nahi jaati

---

## Step 1: Node.js check karo
```
node -v
```
Version dikhna chahiye (v18+).

---

## Step 2: Dependencies install karo
```
npm install
```

---

## Step 3: `.env` file banao
`.env.example` ko copy karke `.env` banao, andar ye daalo:
```
GEMINI_API_KEY=apni_asli_gemini_key
SESSION_SECRET=koi_bhi_random_lamba_text
PORT=3000
```
Gemini key `aistudio.google.com/apikey` se milegi (free, card nahi chahiye).

⚠️ `.env` file kabhi GitHub pe upload mat karna.

---

## Step 4: Server start karo
```
npm start
```
```
✅ Server running: http://localhost:3000
```

---

## Step 5: Browser mein kholo
`http://localhost:3000` pe jao.

**Pehli baar:** "Sign up" pe click karo, naam/email/password daal ke account banao.
**Agli baar se:** Same email/password se "Log In" kar sakte ho.

---

## Users kaha store hote hain?
`data/users.json` file mein — passwords **plain text mein nahi**, bcrypt se hash karke store hote hain (real-world best practice). Ye file bhi `.gitignore` mein hai, GitHub pe nahi jaati.

---

## College demo ke waqt kya bolna hai
- "Signup/Login system hai — passwords bcrypt se hashed hain, plain text mein store nahi hote"
- "Sessions cookies ke through maintain hote hain (`express-session`)"
- "Bina login kiye `/api/chat` endpoint access nahi ho sakta — backend pe bhi protect kiya hai, sirf frontend pe nahi"
- "AI responses Google Gemini API se aate hain, backend ke through (key kabhi client-side expose nahi hoti)"

---

## Common dikkatein
| Problem | Solution |
|---|---|
| "EADDRINUSE" error | Purana server chal raha hai; `netstat -ano \| findstr :3000` se PID dhoondo, `taskkill /PID <num> /F` |
| Signup pe "already exists" | Wo email pehle se registered hai, login try karo ya doosra email use karo |
| Login pe "incorrect password" | Password galat hai, ya signup ke time koi typo hui thi |
| Chat pe "Please sign in first" | Session expire ho gaya hoga, dubara login karo |
