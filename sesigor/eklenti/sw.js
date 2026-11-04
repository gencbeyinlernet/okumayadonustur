// SESİGÖR hizmet çalışanı: yan paneli açar, kullanıcı başlattığında sekme sesini ekran dışı belgeye bağlar.
// Sürekli ses işleme kısa ömürlü arka plan sürecinde değil, ekran dışı belgede yürütülür.
chrome.runtime.onInstalled.addListener(() => chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }));

let capturingTab = null;

async function ensureOffscreen() {
  const exists = await chrome.offscreen.hasDocument?.();
  if (exists) return;
  await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['USER_MEDIA'], justification: 'Kullanıcının başlattığı sekme sesini cihaz üzerinde altyazıya ve ses olayı etiketlerine dönüştürmek' });
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.to !== 'sw') return;
    if (msg.type === 'start') {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab) throw new Error('Etkin sekme bulunamadı.');
      const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
      await ensureOffscreen();
      capturingTab = tab.id;
      // ekran dışı belgenin betiği yüklenene kadar kısa aralıklarla dene
      let ok = false;
      for (let i = 0; i < 40 && !ok; i++) {
        ok = await chrome.runtime.sendMessage({ to: 'offscreen', type: 'ping' }).catch(() => false);
        if (!ok) await new Promise((r) => setTimeout(r, 100));
      }
      chrome.runtime.sendMessage({ to: 'offscreen', type: 'start', streamId, keepAudio: msg.keepAudio !== false, rules: msg.rules }).catch(() => {});
      reply({ ok: true, tab: { title: tab.title, url: tab.url } });
    } else if (msg.type === 'stop') {
      await chrome.runtime.sendMessage({ to: 'offscreen', type: 'stop' }).catch(() => {});
      capturingTab = null;
      reply({ ok: true });
    } else if (msg.type === 'export') {
      const r = await chrome.runtime.sendMessage({ to: 'offscreen', type: 'export' }).catch(() => null);
      reply(r);
    }
  })().catch((e) => reply({ ok: false, error: e.message }));
  return true;
});

chrome.tabs.onRemoved.addListener((id) => { if (id === capturingTab) chrome.runtime.sendMessage({ to: 'offscreen', type: 'stop' }).catch(() => {}); });
