# Changelog

Všechny významné změny v tomto projektu budou dokumentovány v tomto souboru.

Formát je založen na [Keep a Changelog](https://keepachangelog.com/cs/1.0.0/),
a tento projekt dodržuje [Semantic Versioning](https://semver.org/lang/cs/).

## [1.0.0] - 2025-XX-XX

### Přidáno
- Základní funkce pluginu pro Homebridge
- Podpora pro Bose Home Speaker 300 a další kompatibilní zařízení
- Automatické objevování zařízení přes mDNS
- Manuální konfigurace zařízení
- Ovládání power (zapnutí/vypnutí)
- Ovládání hlasitosti (0-100)
- Ovládání ztlumení (mute)
- WebSocket komunikace s lokálním zařízením
- Autentizace přes Bose cloud API
- Automatické reconnect při výpadku spojení
- Konfigurace přes Homebridge UI
- Dokumentace v češtině

### Technické
- Node.js API pro komunikaci s Bose
- HomeKit Speaker service
- HomeKit Switch service pro power
- Token management a refresh
- Podpora pro více zařízení současně
- Polling interval pro aktualizaci stavu

## [Naplánované] - Budoucí verze

### V plánu
- Podpora pro více zdrojů (AUX, Optical, HDMI)
- Ovládání EQ nastavení (bass, treble, center, surround)
- Groupování reproduktorů (multi-room)
- Přehrávání médií (play, pause, skip)
- Výběr Bluetooth zdroje
- Podpora pro bass module
- Podpora pro surround speakers
- Lepší error handling
- Lokalizace do dalších jazyků
- Automatické aktualizace tokenu
- Offline režim (bez cloud autentizace)

### Známé problémy
- Vyžaduje Bose cloud účet i pro lokální ovládání
- Auto-discovery nemusí fungovat ve všech sítích
- SoundTouch zařízení nejsou podporována
- Některé pokročilé funkce zatím chybí

## Jak přispět

Pokud chcete přispět k vývoji tohoto pluginu:
1. Forkněte repository
2. Vytvořte feature branch
3. Commitněte vaše změny
4. Otevřete Pull Request

Každý Pull Request by měl:
- Obsahovat jasný popis změn
- Být testován na reálném zařízení
- Dodržovat stávající kódovací styl
- Aktualizovat CHANGELOG.md

---

Formát založen na [Keep a Changelog](https://keepachangelog.com/)
