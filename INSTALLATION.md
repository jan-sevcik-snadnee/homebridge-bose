# Detailní instalační průvodce

## Krok 1: Příprava

### Požadavky
- Funkční instalace Homebridge
- Node.js verze 14.0 nebo vyšší
- Účet Bose (potřebný pro autentizaci)
- Bose Home Speaker 300 (nebo jiné kompatibilní zařízení) připojené k Wi-Fi

### Vytvoření Bose účtu (pokud ho ještě nemáte)

1. Stáhněte si Bose Music App z App Store nebo Google Play
2. Otevřete aplikaci a vytvořte nový účet
3. Přidejte své Bose zařízení do aplikace
4. Ověřte, že můžete zařízení ovládat přes aplikaci

## Krok 2: Instalace pluginu

### Instalace přes Homebridge Config UI X (doporučeno)

1. Otevřete webové rozhraní Homebridge (obvykle http://raspberry-pi-ip:8581)
2. Přihlaste se
3. Klikněte na záložku "Plugins"
4. Do vyhledávacího pole napište "homebridge-bose"
5. Klikněte na tlačítko "INSTALL"
6. Počkejte na dokončení instalace

### Instalace přes příkazovou řádku

```bash
# Přihlaste se jako uživatel, který spouští Homebridge (obvykle 'pi' nebo 'homebridge')
sudo -u homebridge -i

# Nainstalujte plugin
npm install -g homebridge-bose

# Restartujte Homebridge
sudo systemctl restart homebridge
```

## Krok 3: Konfigurace

### Varianta A: Konfigurace přes Homebridge UI (jednodušší)

1. Po instalaci klikněte na "SETTINGS" u pluginu
2. Vyplňte:
   - **Email**: Váš Bose účet email
   - **Password**: Vaše Bose účet heslo
   - **Auto-discover devices**: Zapnuto (doporučeno)
   - **Status Poll Interval**: 10 sekund (výchozí)
3. Klikněte na "SAVE"
4. Restartujte Homebridge

### Varianta B: Manuální konfigurace

1. Otevřete konfigurační soubor:
```bash
nano ~/.homebridge/config.json
```

2. Přidejte do sekce `platforms`:
```json
{
  "platform": "BoseSpeaker",
  "name": "Bose Speakers",
  "email": "vas-email@example.com",
  "password": "vase-heslo",
  "autoDiscover": true,
  "pollInterval": 10
}
```

3. Uložte soubor (Ctrl+O, Enter, Ctrl+X v nano)

4. Restartujte Homebridge:
```bash
sudo systemctl restart homebridge
```

## Krok 4: Ověření

### Zkontrolujte logy

```bash
# Pokud používáte systemd
sudo journalctl -u homebridge -f

# Nebo pokud používáte PM2
pm2 logs homebridge
```

Měli byste vidět něco jako:
```
[Bose Speakers] Successfully authenticated with Bose cloud
[Bose Speakers] Starting auto-discovery of Bose devices...
[Bose Speakers] Discovered Bose device: Home Speaker 300 (192.168.1.100)
[Bose Speakers] Found 1 Bose device(s)
[Bose Speakers] Adding new accessory: Home Speaker 300
[Bose Speakers] Connected to Home Speaker 300
```

### Přidání do HomeKit

1. Otevřete aplikaci Home na vašem iPhone/iPad
2. Klikněte na "+" v pravém horním rohu
3. Vyberte "Přidat příslušenství"
4. Naskenujte QR kód z Homebridge (nebo zadejte PIN manuálně)
5. Měli byste vidět vaše Bose zařízení

## Řešení problémů při instalaci

### Plugin se nenainstaluje

**Chyba**: `EACCES: permission denied`

**Řešení**:
```bash
# Použijte správného uživatele
sudo -u homebridge npm install -g homebridge-bose
```

**Chyba**: `gyp ERR! build error`

**Řešení**:
```bash
# Nainstalujte build tools
sudo apt-get install build-essential python3
npm install -g homebridge-bose
```

### Auto-discovery nefunguje

1. **Zkontrolujte síť**: Ujistěte se, že Homebridge a Bose jsou ve stejné síti
2. **Vypněte firewall dočasně**: `sudo ufw disable` (nezapomeňte ho zase zapnout!)
3. **Zkuste manuální konfiguraci**: Viz níže

### Manuální přidání zařízení

Pokud auto-discovery nefunguje, můžete přidat zařízení manuálně:

1. **Zjistěte IP adresu vašeho Bose zařízení**:
   - Z routeru (seznam připojených zařízení)
   - Nebo použijte nmap: `nmap -sn 192.168.1.0/24`

2. **Zjistěte GUID (MAC adresu)**:
   - Často je na štítku na zařízení
   - Nebo v nastavení routeru
   - Formát: `XXXXXXXXXXXX` (12 hexadecimálních znaků bez oddělovačů)

3. **Upravte config.json**:
```json
{
  "platform": "BoseSpeaker",
  "name": "Bose Speakers",
  "email": "vas-email@example.com",
  "password": "vase-heslo",
  "autoDiscover": false,
  "devices": [
    {
      "name": "Obývák",
      "ip": "192.168.1.100",
      "guid": "AABBCCDDEEFF"
    }
  ]
}
```

### Chyba autentizace

**Chyba v logu**: `Failed to authenticate with Bose`

**Možné příčiny a řešení**:
1. **Špatné přihlašovací údaje**: 
   - Zkontrolujte email a heslo
   - Zkuste se přihlásit do Bose Music App
   
2. **Problém s Bose servery**:
   - Zkuste to později
   - Zkontrolujte https://status.bose.com

3. **Síťový problém**:
   - Zkontrolujte připojení k internetu
   - Zkuste: `curl https://api.bose.io`

### Zařízení se objeví v HomeKit, ale nereaguje

1. **Zkontrolujte připojení k zařízení**:
```bash
# Zkuste ping
ping 192.168.1.100

# Zkontrolujte port 8082
nc -zv 192.168.1.100 8082
```

2. **Restartujte Bose zařízení**:
   - Vypněte ze zásuvky
   - Počkejte 30 sekund
   - Zapněte zpět

3. **Zkontrolujte logy pro podrobnosti**:
```bash
sudo journalctl -u homebridge -f | grep Bose
```

## Pokročilá konfigurace

### Optimalizace pro stabilitu

```json
{
  "platform": "BoseSpeaker",
  "name": "Bose Speakers",
  "email": "vas-email@example.com",
  "password": "vase-heslo",
  "autoDiscover": true,
  "pollInterval": 30,
  "devices": []
}
```

### Více zařízení

```json
{
  "platform": "BoseSpeaker",
  "name": "Bose Speakers",
  "email": "vas-email@example.com",
  "password": "vase-heslo",
  "autoDiscover": false,
  "devices": [
    {
      "name": "Obývák",
      "ip": "192.168.1.100",
      "guid": "AABBCCDDEEFF"
    },
    {
      "name": "Ložnice",
      "ip": "192.168.1.101",
      "guid": "112233445566"
    },
    {
      "name": "Kuchyně",
      "ip": "192.168.1.102",
      "guid": "778899AABBCC"
    }
  ]
}
```

## Časté otázky

**Q: Musím mít Bose účet?**  
A: Ano, bohužel Bose vyžaduje autentizaci přes jejich cloud i pro lokální ovládání.

**Q: Jsou moje přihlašovací údaje v bezpečí?**  
A: Přihlašovací údaje jsou uloženy pouze v config.json na vašem Homebridge. Plugin komunikuje přímo s Bose API.

**Q: Funguje to bez internetu?**  
A: Po počáteční autentizaci funguje komunikace lokálně. Ale při restartu je potřeba přístup k Bose cloud API.

**Q: Mohu používat více Homebridge instancí?**  
A: Ano, ale každá instance potřebuje vlastní konfiguraci.

**Q: Podporuje to SoundTouch reproduktory?**  
A: Ne, SoundTouch používá jiné API. Tento plugin je pouze pro Bose Music kompatibilní zařízení.

## Další pomoc

Pokud máte stále problémy:
1. Zkontrolujte [GitHub Issues](https://github.com/yourusername/homebridge-bose/issues)
2. Vytvořte nový issue s:
   - Verzí Node.js (`node --version`)
   - Verzí Homebridge (`homebridge --version`)
   - Kompletními logy z Homebridge
   - Vaší konfigurací (BEZ hesla!)
