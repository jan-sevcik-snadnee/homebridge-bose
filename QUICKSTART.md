# Rychlý start - Homebridge Bose Plugin

## 🚀 Jak začít (5 minut)

### 1. Instalace
```bash
cd homebridge-bose
npm install
sudo npm link
```

Nebo globálně:
```bash
npm install -g homebridge-bose
```

### 2. Konfigurace

Přidejte do `~/.homebridge/config.json`:

```json
{
  "platforms": [
    {
      "platform": "BoseSpeaker",
      "name": "Bose Speakers",
      "email": "VÁŠ_BOSE_EMAIL",
      "password": "VAŠE_BOSE_HESLO",
      "autoDiscover": true
    }
  ]
}
```

### 3. Restart Homebridge

```bash
# Pokud používáte systemd
sudo systemctl restart homebridge

# Pokud používáte PM2
pm2 restart homebridge

# Nebo manuálně
homebridge -D -U ~/.homebridge
```

### 4. Zkontrolujte logy

```bash
tail -f ~/.homebridge/homebridge.log
```

Měli byste vidět:
```
✓ Successfully authenticated with Bose cloud
✓ Discovered Bose device: Home Speaker 300
✓ Connected to Home Speaker 300
```

### 5. Přidejte do Home App

1. Otevřete Home app na iPhonu
2. Přidejte příslušenství (+ v pravém horním rohu)
3. Naskenujte QR kód z Homebridge
4. Hotovo! 🎉

## 🔧 Řešení problémů

### Zařízení se nenašlo?
```bash
# Zkuste manuální konfiguraci
# Zjistěte IP adresu:
nmap -sn 192.168.1.0/24 | grep -i bose

# Přidejte do config.json:
"devices": [
  {
    "name": "Můj Bose",
    "ip": "192.168.1.XXX",
    "guid": "XXXXXXXXXXXX"
  }
]
```

### Chyba autentizace?
- Zkontrolujte email a heslo
- Přihlaste se do Bose Music App pro ověření

### Port 8082 blokován?
```bash
# Zkontrolujte firewall
sudo ufw status
sudo ufw allow 8082/tcp
```

## 📁 Struktura projektu

```
homebridge-bose/
├── index.js              # Hlavní Homebridge platforma
├── bose-api.js           # API pro komunikaci s Bose
├── package.json          # NPM konfigurace
├── config.schema.json    # Schema pro Homebridge UI
├── README.md             # Kompletní dokumentace
├── INSTALLATION.md       # Detailní instalační průvodce
├── CHANGELOG.md          # Historie změn
└── config.example.json   # Ukázková konfigurace
```

## 📚 Další dokumentace

- **[README.md](README.md)** - Kompletní dokumentace
- **[INSTALLATION.md](INSTALLATION.md)** - Detailní instalační průvodce
- **[CHANGELOG.md](CHANGELOG.md)** - Historie změn

## 🆘 Potřebujete pomoc?

1. Zkontrolujte [INSTALLATION.md](INSTALLATION.md) pro řešení problémů
2. Otevřete issue na GitHubu
3. Připojte logy z Homebridge

## ✨ Funkce

✅ Zapnutí/vypnutí  
✅ Ovládání hlasitosti  
✅ Ztlumení (mute)  
✅ Auto-discovery  
✅ Více zařízení  
✅ Automatické reconnect  

## 🎯 Testováno na

- Bose Home Speaker 300 ✅
- Bose Home Speaker 500 ✅
- Bose Soundbar 700 ✅
- Bose Soundbar 900 ✅

Máte jiné zařízení? Otevřete issue a dejte vědět!

---

Made with ❤️ for Homebridge & Bose users
