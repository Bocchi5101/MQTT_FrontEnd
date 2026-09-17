import React, { useEffect, useRef, useState } from 'react';
import mqtt from 'mqtt';
import { topicsFor, decodeMessage } from './protocol.js';

const labels = { idle: 'ยังไม่เชื่อมต่อ', connecting: 'กำลังเชื่อมต่อ', subscribing: 'กำลังสมัครรับข้อมูล', ready: 'เชื่อมต่อแล้ว', reconnecting: 'กำลังเชื่อมต่อใหม่', error: 'เชื่อมต่อไม่สำเร็จ' };
const empty = () => ({ temp: null, humidity: null, led: null });
const time = (stamp) => new Date(stamp).toLocaleTimeString('th-TH');

export default function App() {
  const [config, setConfig] = useState({ url: '', username: '', password: '', prefix: 'lab' });
  const [status, setStatus] = useState('idle');
  const [readings, setReadings] = useState(empty);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  const [now, setNow] = useState(Date.now());
  const clientRef = useRef(null);
  const topicsRef = useRef(null);
  const pendingRef = useRef(null);
  const timerRef = useRef(null);

  function log(direction, topic, payload) {
    setEvents(list => [{ id: crypto.randomUUID(), at: Date.now(), direction, topic, payload: payload.slice(0, 180) }, ...list].slice(0, 30));
  }
  function clearPending() {
    clearTimeout(timerRef.current);
    pendingRef.current = null;
    setPending(null);
  }
  function disconnect() {
    const client = clientRef.current;
    clientRef.current = null;
    if (client) { client.removeAllListeners(); client.end(true); }
    clearPending(); setStatus('idle'); setReadings(empty());
  }
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(clock); clearTimeout(timerRef.current);
      const client = clientRef.current;
      clientRef.current = null;
      if (client) { client.removeAllListeners(); client.end(true); }
    };
  }, []);

  function connect(event) {
    event.preventDefault();
    setError('');
    let topics;
    try {
      const url = new URL(config.url.trim());
      if (url.protocol !== 'wss:') throw new Error('กรุณาใช้ URL แบบ wss://HOST:8884/mqtt');
      topics = topicsFor(config.prefix);
    } catch (e) { setError(e.message); return; }
    disconnect(); setEvents([]); setStatus('connecting'); topicsRef.current = topics;
    let client;
    try {
      client = mqtt.connect(config.url.trim(), {
        username: config.username, password: config.password,
        clientId: `web_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`,
        clean: true, connectTimeout: 10000, reconnectPeriod: 3000,
        resubscribe: false, queueQoSZero: false,
      });
    } catch (e) { setError(e.message); setStatus('error'); return; }
    clientRef.current = client;
    const current = () => clientRef.current === client;
    client.on('connect', () => {
      if (!current()) return;
      setStatus('subscribing'); setError('');
      client.subscribe([topics.temp, topics.humidity, topics.led], { qos: 0 }, (err, granted) => {
        if (!current()) return;
        if (err || !granted || granted.some(item => item.qos === 128)) {
          setError('สมัครรับข้อมูลไม่สำเร็จ ตรวจสิทธิ์ MQTT topics');
          clientRef.current = null; client.removeAllListeners(); client.end(true); setStatus('error');
        } else setStatus('ready');
      });
    });
    client.on('message', (topic, bytes, packet) => {
      if (!current()) return;
      const text = bytes.toString();
      log(packet.retain ? 'รับ · retained' : 'รับ', topic, text);
      try {
        const parsed = decodeMessage(topics, topic, text);
        if (!parsed) return;
        setReadings(prev => ({ ...prev, [parsed.key]: { value: parsed.value, at: Date.now(), retained: packet.retain } }));
        // Only a received, non-retained matching status completes a command.
        if (parsed.key === 'led' && !packet.retain && parsed.value === pendingRef.current) clearPending();
      } catch (e) { setError(`${e.message} (${topic})`); }
    });
    client.on('reconnect', () => { if (current()) setStatus('reconnecting'); });
    client.on('close', () => {
      if (!current()) return;
      setStatus('reconnecting'); clearPending(); setReadings(empty());
    });
    client.on('error', () => {
      if (current()) setError('เชื่อมต่อ MQTT มีปัญหา ตรวจ URL, username, password, สิทธิ์ และอินเทอร์เน็ต');
    });
  }

  function command(value) {
    const client = clientRef.current;
    if (status !== 'ready' || !client?.connected || pendingRef.current) return;
    setError(''); pendingRef.current = value; setPending(value);
    timerRef.current = setTimeout(() => {
      clearPending(); setError('ยังไม่ได้รับสถานะยืนยันภายใน 8 วินาที ตรวจว่าบอร์ดออนไลน์และรับ topic control');
    }, 8000);
    client.publish(topicsRef.current.control, value, { qos: 0, retain: false }, err => {
      if (clientRef.current !== client) return;
      if (err) { clearPending(); setError('ส่งคำสั่งไม่สำเร็จ'); }
      else log('ส่ง', topicsRef.current.control, value);
    });
  }
  const connected = status === 'ready';
  const locked = !['idle', 'error'].includes(status);
  const latestSensor = Math.max(readings.temp?.at || 0, readings.humidity?.at || 0);
  const fresh = connected && latestSensor > 0 && now - latestSensor < 15000;
  const age = reading => reading ? `รับเมื่อ ${time(reading.at)}${reading.retained ? ' · ค่าที่ broker เก็บไว้' : ''}` : 'รอข้อมูลจากบอร์ด';
  const field = (key, title, placeholder, type = 'text') => <label>{title}<input type={type} value={config[key]} placeholder={placeholder} required={key === 'url' || key === 'prefix'} disabled={locked} autoComplete="off" onChange={e => setConfig({ ...config, [key]: e.target.value })}/></label>;

  return <main>
    <header><a className="brand" href="#">◈ <span>IoT / LAB</span></a><span className={`badge ${connected ? 'good' : ''}`}><i/>{labels[status]}</span></header>
    <section className="intro"><div><div className="eyebrow">LIVE DEVICE DASHBOARD</div><h1>มองเห็นข้อมูล<br/><em>ควบคุมได้ทันที</em></h1><p>อุณหภูมิ ความชื้น และไฟ LED จากบอร์ด ESP ของคุณ</p></div><div className="device"><span className={`pulse ${fresh ? 'active' : ''}`}/><div><b>{fresh ? 'ได้รับข้อมูลเซนเซอร์ล่าสุด' : 'ยังไม่มีข้อมูลเซนเซอร์ล่าสุด'}</b><small>ESP32 / ESP8266 · อัปเดตทุก 5 วินาที</small></div></div></section>
    <div className="layout"><section className="monitor">
      <div className="section-title"><h2>ข้อมูลจากอุปกรณ์</h2><span>01 / MONITOR</span></div>
      <div className="metrics"><article className="metric"><div className="metric-label"><span>อุณหภูมิ</span><span>↗</span></div><div className="number">{readings.temp ? readings.temp.value.toFixed(1) : '—'}<small>°C</small></div><p>Temperature</p><footer>{age(readings.temp)}</footer></article><article className="metric"><div className="metric-label"><span>ความชื้น</span><span>◌</span></div><div className="number">{readings.humidity ? readings.humidity.value.toFixed(1) : '—'}<small>%</small></div><p>Relative humidity</p><footer>{age(readings.humidity)}</footer></article></div>
      <article className="led-card"><div className="led-heading"><div><div className="eyebrow">LED CONTROL</div><h2>ควบคุมแสงไฟ</h2></div><div className={`bulb ${readings.led?.value === 'ON' ? 'lit' : ''}`}>☼</div></div><div className="led-status">{readings.led ? (readings.led.value === 'ON' ? 'เปิดอยู่ · ON' : 'ปิดอยู่ · OFF') : 'ยังไม่ทราบสถานะ'}</div><p>{age(readings.led)}</p><div className="actions"><button disabled={!connected || !!pending} onClick={() => command('ON')}>เปิดไฟ <span>ON ↗</span></button><button className="secondary" disabled={!connected || !!pending} onClick={() => command('OFF')}>ปิดไฟ <span>OFF ↘</span></button></div><small aria-live="polite">{pending ? `กำลังรอบอร์ดยืนยัน ${pending}…` : 'สถานะจะเปลี่ยนเมื่อได้รับรายงานจากบอร์ด รวมถึงเมื่อกดปุ่มจริง'}</small></article>
      {connected && !fresh && <p className="hint">เชื่อมต่อ broker แล้ว แต่ยังยืนยันไม่ได้ว่าบอร์ดออนไลน์ ค่า LED ที่เก็บไว้ไม่ใช่สถานะการเชื่อมต่อของบอร์ด</p>}
    </section><aside><div className="section-title"><h2>การเชื่อมต่อ</h2><span>02 / CONNECT</span></div><form onSubmit={connect}>{field('url', 'HiveMQ WebSocket URL', 'wss://YOUR-CLUSTER:8884/mqtt')}{field('username', 'MQTT username', 'ชื่อผู้ใช้ MQTT')}{field('password', 'MQTT password', 'รหัสผ่าน MQTT', 'password')}{field('prefix', 'Topic prefix', 'lab')}<p className="hint">ใช้ prefix เดียวกับโค้ด ESP เช่น lab หรือ lab/รหัสนักศึกษา รหัสผ่านเก็บในหน่วยความจำหน้านี้เท่านั้น</p><button className="connect" disabled={locked} type="submit">เชื่อมต่อ HiveMQ <span>→</span></button>{locked && <button className="disconnect" type="button" onClick={disconnect}>ตัดการเชื่อมต่อ / แก้ไขค่า</button>}</form></aside></div>
    {error && <div role="alert" className="error">{error}<button aria-label="ปิดข้อความแจ้งเตือน" onClick={() => setError('')}>×</button></div>}
    <section className="firmware-download" aria-labelledby="firmware-title"><div><div className="eyebrow">BOARD CODE</div><h2 id="firmware-title">ดาวน์โหลดโค้ดสำหรับบอร์ด</h2><p>ตัวอย่างสำหรับ NodeMCU ESP8266 + DHT11 · เปิดด้วย Arduino IDE และแก้ข้อมูล Wi-Fi / HiveMQ ก่อนอัปโหลด</p><small>หากใช้ ESP32 หรือเซนเซอร์รุ่นอื่น ต้องปรับโค้ดและขาต่อให้ตรงกับอุปกรณ์ก่อน</small></div><a className="download-button" href="./esp8266_iot_lab/esp8266_iot_lab.ino" download="esp8266_iot_lab.ino">↓ Download โค้ด ESP8266 <span>.ino</span></a></section>
    <section className="log"><div className="section-title"><h2>ข้อความล่าสุด</h2><span>03 / ACTIVITY</span></div><div className="table-wrap"><table><thead><tr><th>เวลา</th><th>ทิศทาง</th><th>Topic</th><th>ข้อมูล</th></tr></thead><tbody>{events.length ? events.map(item => <tr key={item.id}><td>{time(item.at)}</td><td>{item.direction}</td><td><code>{item.topic}</code></td><td>{item.payload}</td></tr>) : <tr><td colSpan="4" className="empty">เมื่อเชื่อมต่อแล้ว ข้อความจากบอร์ดจะแสดงที่นี่</td></tr>}</tbody></table></div></section><footer className="page-footer"><a href="./summary.html">อ่านสรุป IoT Lab ↗</a><span>อุปกรณ์ → HiveMQ → Dashboard</span></footer>
  </main>;
}
