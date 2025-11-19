const { BoseAuth, BoseDiscovery, BoseSpeaker } = require('./bose-api');

let Service, Characteristic;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  
  homebridge.registerPlatform('homebridge-bose', 'BoseSpeaker', BosePlatform);
};

class BosePlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;
    
    this.accessories = [];
    this.speakers = new Map();
    
    if (!config) {
      this.log.warn('No configuration found for homebridge-bose');
      return;
    }
    
    if (!config.email || !config.password) {
      this.log.error('Bose email and password are required in config');
      return;
    }
    
    // Inicializace autentizace
    this.auth = new BoseAuth(config.email, config.password, log);
    
    if (api) {
      this.api.on('didFinishLaunching', () => {
        this.log.info('Homebridge Bose Plugin Loaded');
        this.discoverDevices();
      });
    }
  }

  async discoverDevices() {
    try {
      // Získání access tokenu
      await this.auth.getAccessToken();
      
      const devices = [];
      
      // Auto-discovery pokud je zapnuto
      if (this.config.autoDiscover !== false) {
        this.log.info('Starting auto-discovery of Bose devices...');
        const discovery = new BoseDiscovery(this.log);
        const discovered = await discovery.discoverDevices(10000);
        devices.push(...discovered);
      }
      
      // Přidání manuálně konfigurovaných zařízení
      if (this.config.devices && Array.isArray(this.config.devices)) {
        this.config.devices.forEach(device => {
          if (device.ip && device.guid) {
            devices.push({
              name: device.name,
              ip: device.ip,
              guid: device.guid,
              port: 8082
            });
          }
        });
      }
      
      if (devices.length === 0) {
        this.log.warn('No Bose devices found. Please check your network or add devices manually in config.');
        return;
      }
      
      this.log.info(`Found ${devices.length} Bose device(s)`);
      
      // Vytvoření accessory pro každé zařízení
      for (const device of devices) {
        const uuid = this.api.hap.uuid.generate(device.guid);
        const existingAccessory = this.accessories.find(acc => acc.UUID === uuid);
        
        if (existingAccessory) {
          // Aktualizace existujícího accessory
          this.log.info(`Restoring cached accessory: ${device.name}`);
          existingAccessory.context.device = device;
          new BoseAccessory(this, existingAccessory);
        } else {
          // Vytvoření nového accessory
          this.log.info(`Adding new accessory: ${device.name}`);
          const accessory = new this.api.platformAccessory(device.name, uuid);
          accessory.context.device = device;
          new BoseAccessory(this, accessory);
          this.api.registerPlatformAccessories('homebridge-bose', 'BoseSpeaker', [accessory]);
          this.accessories.push(accessory);
        }
      }
      
      // Odstranění starých accessories
      const validUUIDs = devices.map(d => this.api.hap.uuid.generate(d.guid));
      const accessoriesToRemove = this.accessories.filter(acc => !validUUIDs.includes(acc.UUID));
      
      if (accessoriesToRemove.length > 0) {
        this.log.info(`Removing ${accessoriesToRemove.length} cached accessory(ies)`);
        this.api.unregisterPlatformAccessories('homebridge-bose', 'BoseSpeaker', accessoriesToRemove);
        this.accessories = this.accessories.filter(acc => validUUIDs.includes(acc.UUID));
      }
      
    } catch (error) {
      this.log.error('Failed to discover devices:', error.message);
    }
  }

  configureAccessory(accessory) {
    this.log.info(`Loading accessory from cache: ${accessory.displayName}`);
    this.accessories.push(accessory);
  }
}

class BoseAccessory {
  constructor(platform, accessory) {
    this.platform = platform;
    this.accessory = accessory;
    this.log = platform.log;
    this.config = platform.config;
    
    const device = accessory.context.device;
    
    // Inicializace Bose speakeru
    this.speaker = new BoseSpeaker(
      device,
      platform.auth,
      this.log
    );
    
    // Nastavení accessory informací
    this.accessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, 'Bose')
      .setCharacteristic(Characteristic.Model, 'Home Speaker 300')
      .setCharacteristic(Characteristic.SerialNumber, device.guid);
    
    // Odstranění starých services pokud existují
    const oldSpeaker = this.accessory.getService(Service.Speaker);
    if (oldSpeaker) {
      this.log.info('Removing old Speaker service');
      this.accessory.removeService(oldSpeaker);
    }
    
    const oldSwitch = this.accessory.getService(Service.Switch);
    if (oldSwitch) {
      this.log.info('Removing old Power Switch service');
      this.accessory.removeService(oldSwitch);
    }
    
    // Získání nebo vytvoření Lightbulb service (brightness = volume)
    this.lightbulbService = this.accessory.getService(Service.Lightbulb) 
      || this.accessory.addService(Service.Lightbulb);
    
    this.lightbulbService.setCharacteristic(Characteristic.Name, device.name);
    
    // On/Off = Mute control (ON = unmuted, OFF = muted)
    this.lightbulbService
      .getCharacteristic(Characteristic.On)
      .onGet(this.getOn.bind(this))
      .onSet(this.setOn.bind(this));
    
    // Brightness = Volume (0-100)
    this.lightbulbService
      .getCharacteristic(Characteristic.Brightness)
      .onGet(this.getVolume.bind(this))
      .onSet(this.setVolume.bind(this));
    
    // Připojení k zařízení
    this.connect();
    
    // Pravidelné update stavu
    const pollInterval = (this.config.pollInterval || 10) * 1000;
    setInterval(() => {
      this.updateStatus();
    }, pollInterval);
  }

  async connect() {
    try {
      await this.speaker.connect();
      
      // Subscribe k updates
      this.speaker.onUpdate((message) => {
        this.handleUpdate(message);
      });
      
      // Počáteční stav
      await this.updateStatus();
    } catch (error) {
      this.log.error(`Failed to connect to ${this.accessory.displayName}:`, error.message);
    }
  }

  handleUpdate(message) {
    try {
      // Update volume (brightness)
      if (message.updates && message.updates.volume) {
        const volume = message.updates.volume.actual;
        const muted = message.updates.volume.muteEnabled;
        
        this.lightbulbService
          .getCharacteristic(Characteristic.Brightness)
          .updateValue(volume);
        
        // On/Off based on mute state (ON = unmuted, OFF = muted)
        this.lightbulbService
          .getCharacteristic(Characteristic.On)
          .updateValue(!muted);
      }
    } catch (error) {
      this.log.error('Failed to handle update:', error.message);
    }
  }

  async updateStatus() {
    try {
      // Update volume (brightness) a mute state (on/off)
      const volume = await this.speaker.getVolume();
      const muted = await this.speaker.getMuteState();
      
      this.lightbulbService
        .getCharacteristic(Characteristic.Brightness)
        .updateValue(volume);
      
      // On/Off based on mute (ON = unmuted, OFF = muted)
      this.lightbulbService
        .getCharacteristic(Characteristic.On)
        .updateValue(!muted);
    } catch (error) {
      // Tichá chyba - zařízení může být dočasně nedostupné
      this.log.debug('Failed to update status:', error.message);
    }
  }

  async getOn() {
    try {
      // On = unmuted, Off = muted
      const muted = await this.speaker.getMuteState();
      return !muted;
    } catch (error) {
      this.log.error('Failed to get on/off state:', error.message);
      throw new Error('Failed to get on/off state');
    }
  }

  async setOn(value) {
    try {
      // ON = unmute, OFF = mute
      await this.speaker.setMuteState(!value);
      // this.log.info(`${this.accessory.displayName} ${value ? 'unmuted' : 'muted'}`);
    } catch (error) {
      this.log.error('Failed to set on/off state:', error.message);
      throw new Error('Failed to set on/off state');
    }
  }

  async getVolume() {
    try {
      return await this.speaker.getVolume();
    } catch (error) {
      this.log.error('Failed to get volume:', error.message);
      throw new Error('Failed to get volume');
    }
  }

  async setVolume(value) {
    try {
      await this.speaker.setVolume(value);
      // this.log.info(`${this.accessory.displayName} volume set to ${value}`);
    } catch (error) {
      this.log.error('Failed to set volume:', error.message);
      throw new Error('Failed to set volume');
    }
  }
}
