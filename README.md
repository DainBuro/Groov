# Groov

## Sprendžiamo uždavinio aprašymas

### Sistemos paskirtis
Projekto tikslas – padėti šokėjams prisiminti ar išmokti naujus šokių judesius, ruošti pasirodymus.

Sistema susideda iš:
- **Klientinės dalies** (naršyklėje veikiantis puslapis)
- **Serverinės dalies** (API, duomenų bazė)

**Prieigos teisės:**
- **Neprisijungę** vartotojai gali peržiūrėti judesius, kombinacijas.
- **Prisijungę** vartotojai gali kurti savo šokių sekas, reitinguoti kitų.
- **Administratorius** tvarko judesius, variacijas, vartotojus.

Sistema orientuota į „lindy hop“ stilių, bet palaiko kitų stilių pridėjimą.

### Funkciniai reikalavimai

**Neregistruotas vartotojas gali:**
- Peržiūrėti pagrindinį puslapį
- Peržiūrėti šokių judesius ir jų variacijas
- Filtruoti ir ieškoti judesių
- Peržiūrėti kitų žmonių šokius
- Registruotis

**Registruotas vartotojas gali:**
- Prisijungti / atsijungti
- Gauti judesių rekomendacijas
- Valdyti savo šokius (judesių sekas)
- Reitinguoti kitų žmonių šokius

**Administratorius gali:**
- Valdyti šokio judesius ir jų variacijas
- Šalinti naudotojus

---

## Pasirinktos technologijos

**Stack:**
- **Front-End:** React.js
- **Back-End:** Node.js + Express.js
- **Duomenų bazė:** PostgreSQL

**Diegimas:**
- **Konteinerizacija:** Docker + Docker Compose (trijų konteinerių: Nginx, Node.js, PostgreSQL)
- **Debesų platforma:** Azure (Container Registry, Container Instances / App Service, PostgreSQL Flexible Server)

**Autentifikacija:** JWT (HTTP-only slapukuose)

**Projekto saugykla:** [GitHub – Groov](https://github.com/DainBuro/Groov)

---

## API specifikacija

### Autentifikacija
- JWT (access + refresh token'ai HTTP-only slapukuose)
- Endpoint'ai:
  - `POST /auth/signup` – registracija
  - `POST /auth/login` – prisijungimas
  - `POST /auth/logout` – atsijungimas
  - `POST /auth/refresh` – token atnaujinimas
  - `GET /auth/me` – dabartinis vartotojas

### Šokių judesių valdymas (CRUD)
- `GET /dance-moves` – sąrašas, paieška, filtrai
- `POST /dance-moves` – naujas judesys (tik admin)
- `GET/PUT/DELETE /dance-moves/{id}` – konkretus judesys

### Choreografijos (šokių sekos)
- `GET /dance-sequences` – visos sekos
- `POST /dance-sequences` – nauja seka (prisijungęs)
- `GET/PUT/DELETE /dance-sequences/{id}` – konkreti seka

### Judesių priskyrimas sekoms
- `GET /sequence-moves/{id}` – sekos judesiai
- `PUT /sequence-moves/{id}` – pakeisti visus judesius
- `DELETE /sequence-moves/{id}` – pašalinti visus judesius

### Renginių valdymas
- `GET /events` – visi renginiai
- `POST /events` – naujas renginys (tik admin)
- `GET/PUT/DELETE /events/{id}` – konkretus renginys

### Klaidų valdymas
- `200` / `201` – sėkminga
- `400` – blogi duomenys
- `401` – neautentifikuotas
- `403` – nepakanka teisių
- `404` – resursas nerastas

---

## Projekto išvados

Groov projektas sėkmingai įgyvendintas kaip moderni full-stack šokių mokymosi platforma su:

- Saugia autentifikacija (JWT)
- Moduline architektūra
- REST API su dokumentacija
- Rolės pagrįstu prieigos valdymu
- Docker ir Azure diegimu
- TypeScript, dependency injection, testavimo praktikomis

Projektas suteikė vertingos patirties dirbant su Node.js, React, PostgreSQL, Docker ir Azure debesų paslaugomis.
