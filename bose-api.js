const WebSocket = require('ws');
const axios = require('axios');
const { Bonjour } = require('bonjour-service');
const crypto = require('crypto');

// Bose API konstanty (z pybose)
const GIGYA_API_KEY = '3_7PoVX7ELjlWyppFZFGia1Wf1rNGZv_mqVgtqVmYl3Js-hQxZiFIU8uHxd8G6PyNz';
const BOSE_API_KEY = '67616C617061676F732D70726F642D6D61647269642D696F73';
const GIGYA_UA = 'Bose/32768 MySSID/1568.300.101 Darwin/24.2.0';

class BoseAuth {
  constructor(email, password, log) {
    this.email = email;
    this.password = password;
    this.log = log;
    this.accessToken = null;
    this.refreshToken = null;
    this.bosePersonId = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    // Pokud máme platný token, vrátíme ho
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Jinak získáme nový token přes celý autentizační flow
    try {
      this.log.info('Starting Bose authentication...');
      
      // Krok 1: Získání GMID a UCID
      const ids = await this._getIds();
      if (!ids) {
        throw new Error('Failed to get GMID and UCID');
      }
      
      // Krok 2: Login přes Gigya
      const loginData = await this._login(ids.gmid, ids.ucid);
      
      // Krok 3: Získání JWT z Gigya
      const gigyaJwt = await this._getJWT(loginData, ids.gmid, ids.ucid);
      
      // Krok 4: Výměna JWT za Bose access token
      const token = await this._fetchKeys(gigyaJwt, loginData);
      
      this.accessToken = token.access_token;
      this.refreshToken = token.refresh_token;
      this.bosePersonId = token.bosePersonID;
      this.tokenExpiry = Date.now() + (token.expires_in * 1000) - 60000;

      this.log.info('Successfully authenticated with Bose cloud');
      return this.accessToken;
    } catch (error) {
      this.log.error('Failed to authenticate with Bose:', error.message);
      throw error;
    }
  }

  async _getIds() {
    try {
      const response = await axios.get('https://socialize.us1.gigya.com/socialize.getSDKConfig', {
        params: {
          apikey: GIGYA_API_KEY,
          format: 'json',
          httpStatusCodes: false,
          include: 'permissions,ids,appIds',
          sdk: 'ios_swift_1.0.8',
          targetEnv: 'mobile'
        }
      });

      const ids = response.data.ids;
      if (ids && ids.gmid && ids.ucid) {
        this.log.debug('Got GMID and UCID');
        return { gmid: ids.gmid, ucid: ids.ucid };
      }
      return null;
    } catch (error) {
      this.log.error('Error getting IDs:', error.message);
      return null;
    }
  }

  async _login(gmid, ucid) {
    try {
      const response = await axios.post('https://accounts.us1.gigya.com/accounts.login', null, {
        params: {
          apikey: GIGYA_API_KEY,
          format: 'json',
          gmid: gmid,
          httpStatusCodes: 'false',
          include: 'profile,data,emails,subscriptions,preferences,',
          includeUserInfo: 'true',
          lang: 'de',
          loginID: this.email,
          loginMode: 'standard',
          password: this.password,
          sdk: 'ios_swift_1.0.8',
          sessionExpiration: '0',
          source: 'showScreenSet',
          targetEnv: 'mobile',
          ucid: ucid
        },
        headers: {
          'User-Agent': GIGYA_UA,
          'Accept': '*/*',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const data = response.data;
      if (data.sessionInfo && data.userInfo) {
        this.log.debug('Successfully logged in to Gigya');
        return {
          sessionToken: data.sessionInfo.sessionToken,
          sessionSecret: data.sessionInfo.sessionSecret,
          uid: data.userInfo.UID,
          signatureTimestamp: data.userInfo.signatureTimestamp,
          UIDSignature: data.userInfo.UIDSignature
        };
      }
      throw new Error('Login response missing required fields');
    } catch (error) {
      if (error.response) {
        this.log.error('Login failed:', error.response.data);
      }
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async _getJWT(loginData, gmid, ucid) {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = `${timestamp}_${Math.floor(Math.random() * 1000000000)}`;
      
      const params = {
        apikey: GIGYA_API_KEY,
        format: 'json',
        gmid: gmid,
        httpStatusCodes: 'false',
        nonce: nonce,
        oauth_token: loginData.sessionToken,
        sdk: 'ios_swift_1.0.8',
        targetEnv: 'mobile',
        timestamp: timestamp,
        ucid: ucid
      };

      // Vytvoření OAuth1 signatury
      const baseString = this._calcOAuth1BaseString('POST', 'https://accounts.us1.gigya.com/accounts.getJWT', params);
      const signature = this._calcSignature(baseString, loginData.sessionSecret);
      params.sig = signature;

      const response = await axios.post('https://accounts.us1.gigya.com/accounts.getJWT', null, {
        params: params,
        headers: {
          'User-Agent': GIGYA_UA,
          'Accept': '*/*',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data.id_token) {
        this.log.debug('Got Gigya JWT');
        return response.data.id_token;
      }
      throw new Error('JWT response missing id_token');
    } catch (error) {
      this.log.error('Error getting JWT:', error.message);
      throw error;
    }
  }

  async _fetchKeys(gigyaJwt, loginData) {
    try {
      const response = await axios.post('https://id.api.bose.io/id-jwt-core/token', {
        id_token: gigyaJwt,
        scope: 'openid',
        grant_type: 'id_token',
        signature_timestamp: loginData.signatureTimestamp,
        uid_signature: loginData.UIDSignature,
        uid: loginData.uid,
        client_id: BOSE_API_KEY
      }, {
        headers: {
          'X-ApiKey': BOSE_API_KEY,
          'X-Software-Version': '10.6.6-32768',
          'X-Api-Version': '1',
          'User-Agent': 'MadridApp/10.6.6 (com.bose.bosemusic; build:32768; iOS 18.3.0) Alamofire/5.6.2',
          'Content-Type': 'application/json'
        }
      });

      this.log.debug('Got Bose access token');
      return response.data;
    } catch (error) {
      this.log.error('Error fetching keys:', error.message);
      throw error;
    }
  }

  _calcOAuth1BaseString(method, url, params) {
    // Seřadit parametry podle klíče
    const sortedKeys = Object.keys(params).sort();
    
    // Vytvoř query string
    const queryString = sortedKeys.map(key => {
      const value = params[key];
      return `${this._urlEncode(key)}=${this._urlEncode(value)}`;
    }).join('&');

    // Normalizovat URL (bez query parametrů, bez portu pokud je standard)
    const urlObj = new URL(url);
    let normalizedUrl = `${urlObj.protocol}//${urlObj.hostname.toLowerCase()}`;
    
    // Přidat port pokud není standard
    if (urlObj.port && 
        ((urlObj.protocol === 'http:' && urlObj.port !== '80') || 
         (urlObj.protocol === 'https:' && urlObj.port !== '443'))) {
      normalizedUrl += `:${urlObj.port}`;
    }
    
    normalizedUrl += urlObj.pathname;

    // OAuth1 base string: METHOD&url_encoded(normalized_url)&url_encoded(query_string)
    return `${method.toUpperCase()}&${this._urlEncode(normalizedUrl)}&${this._urlEncode(queryString)}`;
  }

  _urlEncode(value) {
    if (value === null || value === undefined) {
      return '';
    }
    
    // Převést na string
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    // URL encode podle RFC 3986
    return encodeURIComponent(str)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A')
      .replace(/%20/g, '%20') // Mezery jako %20, ne +
      .replace(/%7E/g, '~');   // ~ zůstává nekódované
  }

  _calcSignature(baseString, secret) {
    // DŮLEŽITÉ: Secret musí být dekódován z base64!
    const secretBuffer = Buffer.from(secret, 'base64');
    
    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(baseString);
    
    // Vrátit jako base64
    return hmac.digest('base64');
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      return this.getAccessToken();
    }

    try {
      const response = await axios.post('https://id.api.bose.io/id-jwt-core/token', {
        scope: 'openid',
        client_id: BOSE_API_KEY,
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      }, {
        headers: {
          'X-ApiKey': BOSE_API_KEY,
          'X-Software-Version': '10.6.6-32768',
          'X-Api-Version': '1',
          'User-Agent': 'MadridApp/10.6.6 (com.bose.bosemusic; build:32768; iOS 18.3.0) Alamofire/5.6.2',
          'Content-Type': 'application/json'
        }
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;

      this.log.info('Successfully refreshed Bose token');
      return this.accessToken;
    } catch (error) {
      this.log.error('Failed to refresh token:', error.message);
      return this.getAccessToken();
    }
  }
}

class BoseDiscovery {
  constructor(log) {
    this.log = log;
  }

  async discoverDevices(timeout = 5000) {
    return new Promise((resolve) => {
      const devices = [];
      const bonjourInstance = new Bonjour();

      const browser = bonjourInstance.find({ type: 'soundtouch' }, (service) => {
        const device = {
          name: service.name,
          ip: service.host || service.addresses?.[0],
          guid: service.txt?.MAC || service.txt?.deviceid,
          port: service.port || 8082
        };

        if (device.ip && device.guid) {
          this.log.info(`Discovered Bose device: ${device.name} (${device.ip})`);
          devices.push(device);
        }
      });

      setTimeout(() => {
        browser.stop();
        bonjourInstance.destroy();
        resolve(devices);
      }, timeout);
    });
  }
}

class BoseSpeaker {
  constructor(config, auth, log) {
    this.name = config.name;
    this.ip = config.ip;
    this.guid = config.guid;
    this.port = config.port || 8082;
    this.auth = auth;
    this.log = log;
    
    this.ws = null;
    this.isConnected = false;
    this.messageId = 1;
    this.pendingRequests = new Map();
    this.callbacks = [];
    
    // Stav zařízení
    this.state = {
      power: false,
      volume: 0,
      muted: false,
      source: null,
      nowPlaying: null
    };
  }

  async connect() {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const token = await this.auth.getAccessToken();
      
      // Bose používá WSS (secure WebSocket) s subprotocol "eco2"
      const wsUrl = `wss://${this.ip}:${this.port}/?product=Madrid-iOS:31019F02-F01F-4E73-B495-B96D33AD3664`;
      
      this.log.debug(`Connecting to ${this.name} at ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl, 'eco2', {
        rejectUnauthorized: false, // Ignore SSL certificate errors (Bose uses self-signed)
        headers: {
          'User-Agent': 'MadridApp/10.6.6 (com.bose.bosemusic; build:32768; iOS 18.3.0)'
        }
      });

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws.on('open', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.log.info(`Connected to ${this.name}`);
          
          // Subscribe k updates
          this.subscribe();
          
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          clearTimeout(timeout);
          this.log.error(`WebSocket error for ${this.name}:`, error.message);
          reject(error);
        });

        this.ws.on('close', () => {
          this.isConnected = false;
          this.log.info(`Disconnected from ${this.name}`);
          
          // Automatické reconnect po 5 sekundách
          setTimeout(() => {
            if (!this.isConnected) {
              this.log.info(`Attempting to reconnect to ${this.name}`);
              this.connect().catch(err => {
                this.log.error(`Reconnection failed:`, err.message);
              });
            }
          }, 5000);
        });
      });
    } catch (error) {
      this.log.error(`Failed to connect to ${this.name}:`, error.message);
      throw error;
    }
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      
      // Logování pro debugging
      // this.log.info(`Received from ${this.name}: ${JSON.stringify(message, null, 2)}`);
      this.log.debug(`Received from ${this.name}:`, JSON.stringify(message));
      
      // Pokud je to odpověď na náš request (má reqID)
      if (message.header && message.header.reqID && this.pendingRequests.has(message.header.reqID)) {
        const { resolve, reject } = this.pendingRequests.get(message.header.reqID);
        this.pendingRequests.delete(message.header.reqID);
        
        if (message.header.status >= 400) {
          reject(new Error(`Request failed with status ${message.header.status}`));
        } else {
          resolve(message);
        }
      }
      
      // Update vnitřního stavu z notifikací
      this.updateState(message);
      
      // Volání callbacků
      this.callbacks.forEach(callback => {
        try {
          callback(message);
        } catch (err) {
          this.log.error('Error in callback:', err);
        }
      });
    } catch (error) {
      this.log.error(`Failed to parse message from ${this.name}:`, error.message);
    }
  }

  updateState(message) {
    if (!message.body) return;
    
    // Update power state
    if (message.body.power !== undefined) {
      this.state.power = message.body.power === 'ON';
    }
    
    // Update volume
    if (message.body.value !== undefined) {
      this.state.volume = message.body.value;
    }
    if (message.body.muted !== undefined) {
      this.state.muted = message.body.muted;
    }
    
    // Update now playing
    if (message.header && message.header.resource === '/content/nowPlaying') {
      this.state.nowPlaying = message.body;
    }
    
    // Update source
    if (message.header && message.header.resource === '/system/sources/status') {
      this.state.source = message.body;
    }
  }

  onUpdate(callback) {
    this.callbacks.push(callback);
  }

  async sendRequest(resource, method, body = {}, version = 1) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const token = await this.auth.getAccessToken();
    const reqId = this.messageId++;
    
    const message = {
      header: {
        device: this.guid,
        method: method,
        msgtype: 'REQUEST',
        reqID: reqId,
        resource: resource,
        status: 200,
        token: token,
        version: version
      },
      body: body
    };
    // this.log.info(`Sending to ${this.name}: ${JSON.stringify(message, null, 2)}`);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(reqId, { resolve, reject });
      
      this.ws.send(JSON.stringify(message), (error) => {
        if (error) {
          this.pendingRequests.delete(reqId);
          reject(error);
        }
      });

      // Timeout po 10 sekundách
      setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  async subscribe() {
    try {
      const resources = [
        '/system/power/control',
        '/audio/volume',
        '/content/nowPlaying',
        '/system/sources/status'
      ];
      
      const body = {
        notifications: resources.map(resource => ({
          resource: resource,
          version: 1
        }))
      };
      
      await this.sendRequest('/subscription', 'PUT', body, 2);
      this.log.debug(`Subscribed to updates for ${this.name}`);
    } catch (error) {
      this.log.error(`Failed to subscribe:`, error.message);
    }
  }

  // API metody
  async getPowerState() {
    try {
      const response = await this.sendRequest('/system/power/control', 'GET');
      return response.body?.power === 'ON';
    } catch (error) {
      this.log.error(`Failed to get power state:`, error.message);
      return this.state.power;
    }
  }

  async setPowerState(on) {
    try {
      await this.sendRequest('/system/power/control', 'PUT', { power: on ? 'ON' : 'OFF' });
      this.state.power = on;
      return true;
    } catch (error) {
      this.log.error(`Failed to set power state:`, error.message);
      return false;
    }
  }

  async getVolume() {
    try {
      const response = await this.sendRequest('/audio/volume', 'GET');
      return response.body?.value || 0;
    } catch (error) {
      this.log.error(`Failed to get volume:`, error.message);
      return this.state.volume;
    }
  }

  async setVolume(volume) {
    try {
      await this.sendRequest('/audio/volume', 'PUT', { value: Math.round(volume) });
      this.state.volume = volume;
      return true;
    } catch (error) {
      this.log.error(`Failed to set volume:`, error.message);
      return false;
    }
  }

  async getMuteState() {
    try {
      const response = await this.sendRequest('/audio/volume', 'GET');
      return response.body?.muted || false;
    } catch (error) {
      this.log.error(`Failed to get mute state:`, error.message);
      return this.state.muted;
    }
  }

  async setMuteState(muted) {
    try {
      await this.sendRequest('/audio/volume', 'PUT', { muted: muted });
      this.state.muted = muted;
      return true;
    } catch (error) {
      this.log.error(`Failed to set mute state:`, error.message);
      return false;
    }
  }

  async getNowPlaying() {
    try {
      const response = await this.sendRequest('/content/nowPlaying', 'GET');
      return response.body || null;
    } catch (error) {
      this.log.error(`Failed to get now playing:`, error.message);
      return this.state.nowPlaying;
    }
  }

  async play() {
    try {
      await this.sendRequest('/content/transportControl', 'POST', { state: 'play' });
      return true;
    } catch (error) {
      this.log.error(`Failed to play:`, error.message);
      return false;
    }
  }

  async pause() {
    try {
      await this.sendRequest('/content/transportControl', 'POST', { state: 'pause' });
      return true;
    } catch (error) {
      this.log.error(`Failed to pause:`, error.message);
      return false;
    }
  }

  async skipNext() {
    try {
      await this.sendRequest('/content/transportControl', 'POST', { state: 'next' });
      return true;
    } catch (error) {
      this.log.error(`Failed to skip next:`, error.message);
      return false;
    }
  }

  async skipPrevious() {
    try {
      await this.sendRequest('/content/transportControl', 'POST', { state: 'previous' });
      return true;
    } catch (error) {
      this.log.error(`Failed to skip previous:`, error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}

module.exports = {
  BoseAuth,
  BoseDiscovery,
  BoseSpeaker
};
