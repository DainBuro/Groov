# Groov

# 1. SPRENDŽIAMO UŽDAVINIO APRAŠYMAS

## 1.1. Sistemos paskirtis
Projekto tikslas – padėti šokėjams prisiminti ar išmokti naujus šokių judesius, ruošti pasirodymus.  
Veikimo principas – internetinio puslapio platformą sudarys dvi dalys:  
- naršyklėje pasiekiamas puslapis, skirtas sistemos naudotojams matyti ir sąveikauti su sistema;  
- serverinė dalis, kuri siųs informaciją naudotojų naršyklėms ir saugos informaciją duomenų bazėje.  

Šokėjui norint naudotis sistema, jo bus prašoma prisijungti.  
Neprisijungę vartotojai taip pat galės naudotis sistemos peržiūros pajėgumais:  
- peržiūrėti šokių judesius ir jų variacijas;  
- peržiūrėti prisijungusių žmonių sudarytas šokių sekas.  

Prisijungęs naudotojas galės šias sekas sudaryti pats, jungdamas kelis suderinamus judesius iš eilės. Judesiai bus siūlomi pagal tai, ar sudera pradžios ir pabaigos pozicijos.  

Taip pat bus galima reitinguoti kitų žmonių sudarytas šokių sekas.  
Administratorius bus atsakingas už sistemos palaikymą: judesių ir jų variacijų saugojimą, žalingų vartotojų paskyrų šalinimą.  

Sistemos pradinė versija bus orientuota į „lindy hop“ šokio stilių, tačiau duomenų bazė bus paruošta naujų stilių pridėjimui.

---

## 1.2. Funkciniai reikalavimai

### Neregistruotas sistemos naudotojas gali:
- Peržiūrėti pagrindinį puslapį  
- Peržiūrėti šokių judesius  
- Peržiūrėti judesių variacijas  
- Filtruoti judesius pagal sudėtingumą, pradžios poziciją, pabaigos poziciją  
- Ieškoti judesių pagal pavadinimą  
- Peržiūrėti kitų žmonių išsaugotus šokius  
- Prisiregistruoti prie sistemos  

### Registruotas sistemos naudotojas gali:
- Prisijungti prie sistemos  
- Atsijungti nuo sistemos  
- Gauti judesių rekomendacijas pagal prieš tai buvusį judesį  
- Valdyti savo šokius (judesių sekas)  
- Reitinguoti kitų žmonių šokius  

### Administratorius gali:
- Valdyti šokio judesius  
- Valdyti judesių variacijas  
- Šalinti naudotojus  

---

# 2. PASIRINKTOS TECHNOLOGIJOS

### Sistemos komponentai:
- **Kliento dalis (Front-End):** sukurta naudojant React.js karkasą  
- **Serverio dalis (Back-End):** įgyvendinta su Node.js bei Express.js karkasu  
- **Duomenų bazė:** PostgreSQL sistema  

Toliau pavaizduota sistemos diegimo diagrama. Sistemos talpinimui yra naudojamas **Azure serveris**. Kiekviena sistemos dalis yra diegiama tame pačiame serveryje.  

Internetinė aplikacija yra pasiekiama per **HTTP protokolą** naudojant naršyklę.  

Sistemos veikimui naudojamas **Next.js serveris**, kuris atsakingas už React komponentų pateikimą bei API užklausų apdorojimą.  

Duomenų mainams su **PostgreSQL duomenų baze** Next.js serveris pasitelkia **ORM sąsają**, kuri užtikrina duomenų manipuliavimo galimybes (pvz., užklausas, įrašymą ar atnaujinimą).
