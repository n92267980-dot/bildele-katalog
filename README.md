# AutoDele Katalog (Statisk Webapp)

En hurtig, mørk og mobilvenlig hjemmeside til opslag af bildele, lagerantal og lokationer – bygget i ren HTML, CSS og vanilla JavaScript.

## Sådan kører du siden lokalt
Da siden indlæser `data/parts.json` via JavaScript (`fetch`), skal den åbnes gennem en lokal webserver:
- **VS Code:** Installer udvidelsen **Live Server**, højreklik på `index.html` og vælg **Open with Live Server**.
- **Terminal (Python):** Kør `python -m http.server 8000` i projektmappen og åbn `http://localhost:8000`.

## Sådan opdaterer du data (Admin)
1. Åbn `/admin.html` (klik på knappen **Admin & Lager** øverst til højre).
2. Tilføj, rediger eller slet reservedele, bilmærker, kategorier, underkategorier og lokationer.
3. Ændringerne gemmes med det samme i din browsers `localStorage`, så du kan teste dem på forsiden.
4. Klik på **Download parts.json** for at gemme en ny fil, og erstat filen i mappen `data/` før du deployer på ny.

## Deploy på Netlify
1. Log ind på [app.netlify.com](https://app.netlify.com/).
2. Vælg **Add new site** -> **Deploy manually**.
3. Træk hele mappen `bildele-katalog` ind i upload-feltet.