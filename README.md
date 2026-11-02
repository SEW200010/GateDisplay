# Gate Display

Airport boarding gate display. Backend එක SQL Server database එකෙන් flights කියවනවා. Frontend එක (React) gate එකේ display එකේ flight details පෙන්නනවා. Flight එකක් නැති වෙලාවට ad video එකක් play වෙනවා.

## Folders

```
gate-display/
├── backend/            Node.js + Express API (port 5000)
│   ├── src/
│   │   ├── server.js     API සහ build කරපු frontend එක serve කරනවා
│   │   ├── db.js         SQL Server connection
│   │   ├── ip.js         Display එකේ IP එක හොයනවා
│   │   ├── queries.js    Display එක සහ පෙන්නන්න ඕන flight එක තෝරනවා
│   │   └── operator.js   Flight status වෙනස් කරන API (Postman)
│   ├── .env.example      ".env" කියලා copy කරලා ඔයාගේ values දාන්න
│   └── package.json
├── frontend/           React + Vite
│   ├── src/              App.jsx, AdScreen.jsx, FitText.jsx, Clock.jsx ...
│   ├── public/images/    logo, gate-bg, airlines/, cities/
│   ├── public/videos/    ad.mp4
│   └── package.json
├── database/           SQL scripts
└── display-pc/         Display computers වලට start-display.bat
```

## පළවෙනි පාර setup කරන විදිය

**Node.js 18 හෝ ඊට අලුත් version එකක්** install කරලා තියෙන්න ඕන.

1. **Backend**
   ```
   cd backend
   npm install
   ```
   `.env.example` එක copy කරලා නම `.env` කරන්න. ඊට පස්සේ ඒකට database එකේ user, password වගේ ඔයාගේ values දාන්න.

2. **Frontend**
   ```
   cd frontend
   npm install
   npm run build
   ```

3. **Images සහ video** `frontend/public/` folder එකට දාන්න. ඒ ගැන විස්තර `public/images/PUT-IMAGES-HERE.txt` file එකේ තියෙනවා. Images හෝ video වෙනස් කළාම `npm run build` ආයෙත් කරන්න.

4. **Run කරන්න**
   ```
   cd backend
   npm start
   ```
   ඊට පස්සේ browser එකේ `http://localhost:5000` open කරන්න. වෙන computer එකකින් open කරනවා නම් `http://<server IP>:5000`.

## වෙනස් කරන්න පුළුවන් settings (`backend/.env`)

| Setting | තේරුම |
|---|---|
| `SHOW_BEFORE_MINUTES=1` | Departure එකට කොච්චර විනාඩි ගාණකට කලින් flight එක පේන්න ඕනද |
| `SHOW_AFTER_MINUTES=5` | Departure එකෙන් පස්සේ කොච්චර විනාඩි ගාණක් flight එක පේන්න ඕනද |
| `HIDE_REMARKS` | මේ remarks තියෙන flights කවදාවත් පේන්නේ නැහැ |
| `SCHEDULED_TEXT=Gate Open` | Remark එකක් නැති flight එකක status band එකේ පේන text එක |

`.env` එක වෙනස් කළාට පස්සේ backend එක restart කරන්න.

## Test කරන්න

- **වෙන display එකක් විදියට බලන්න:** URL එකේ අන්තිමට `?ip=10.0.0.5` වගේ IP එකක් එකතු කරන්න. මේක වැඩ කරන්න `.env` එකේ `ALLOW_IP_OVERRIDE=true` කියලා තියෙන්න ඕන.
- **Frontend එක develop කරද්දී:** `cd frontend` කරලා `npm run dev` run කරන්න. Backend එකත් ඒ වෙලාවේ run වෙන්න ඕන.
- **Database එක check කරන්න:** browser එකේ `http://localhost:5000/api/health` open කරන්න.
