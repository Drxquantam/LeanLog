import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { makeBackup, parseBackup } from '../lib/backup';
import { todayKey } from '../lib/date';
import { href } from '../lib/router';
import { Icon } from '../components/Icon';
import { NumField, Toggle } from '../components/ui';

export default function SettingsScreen() {
  const { logs, settings, demo, setDemo, replaceData, updateSettings } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [pending, setPending] = useState<ReturnType<typeof parseBackup> | null>(null);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(makeBackup(logs, settings), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lean-log-${demo ? 'demo-' : ''}${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg({ tone: 'ok', text: `Exported ${logs.length} days.` });
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      setPending(parseBackup(await f.text()));
      setMsg(null);
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Could not read file.' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    try {
      await replaceData(pending.logs, pending.settings);
      setMsg({ tone: 'ok', text: `Imported ${pending.logs.length} days.` });
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Import failed.' });
    }
    setPending(null);
  };

  return (
    <div className="pb-tabbar">
      <header className="safe-top px-4 sm:px-6">
        <div className="pt-4 h-[52px] flex items-center">
          <a href={href({ name: 'profile' })} className="btn-quiet -ml-3 !px-2"><Icon name="chevronLeft" /> <span className="text-[14px]">Profile</span></a>
        </div>
        <h1 className="display text-[40px] leading-[0.95] font-bold tracking-tight pb-4">Settings</h1>
      </header>

      <div className="px-4 sm:px-6 space-y-8">
        <section aria-labelledby="targets-h">
          <h2 id="targets-h" className="eyebrow mb-2">Daily targets</h2>
          <div className="card divide-y divide-line/70">
            {([
              { k: 'steps', label: 'Steps', unit: '', max: 100000 },
              { k: 'cal', label: 'Calories', unit: 'kcal', max: 10000 },
              { k: 'protein', label: 'Protein', unit: 'g', max: 1000 },
            ] as const).map((t) => (
              <label key={t.k} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 text-[14.5px] font-medium">{t.label}</span>
                <span className="w-[130px]">
                  <NumField
                    value={settings[t.k]}
                    onChange={(n) => n !== null && n > 0 && updateSettings({ [t.k]: n })}
                    label={`Daily ${t.label.toLowerCase()} target${t.unit ? ` in ${t.unit}` : ''}`}
                    suffix={t.unit || undefined}
                    className={`field text-right font-medium ${t.unit === 'kcal' ? '!pr-12' : t.unit ? '!pr-9' : ''}`}
                    max={t.max}
                  />
                </span>
              </label>
            ))}
          </div>
        </section>

        <section aria-labelledby="timer-h">
          <h2 id="timer-h" className="eyebrow mb-2">Rest timer</h2>
          <div className="card divide-y divide-line/70">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="flex-1">
                <div className="text-[14.5px] font-medium">Start after each logged set</div>
                <div className="text-[12.5px] text-muted">Vibrates when rest is over, where supported</div>
              </div>
              <Toggle checked={settings.restTimer} onChange={(restTimer) => updateSettings({ restTimer })} label="Rest timer after each set" />
            </div>
            <label className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-[14.5px] font-medium">Rest length</span>
              <span className="w-[120px]">
                <NumField value={settings.restSeconds} onChange={(n) => n !== null && n >= 15 && updateSettings({ restSeconds: n })} label="Rest length in seconds" suffix="sec" className="field text-right !pr-12" max={600} />
              </span>
            </label>
          </div>
        </section>

        <section aria-labelledby="data-h">
          <h2 id="data-h" className="eyebrow mb-2">Backup</h2>
          <div className="card divide-y divide-line/70">
            <button type="button" onClick={doExport} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-raised/40 min-h-[56px]">
              <Icon name="download" className="text-muted" />
              <span className="flex-1">
                <span className="block text-[14.5px] font-medium">Export JSON</span>
                <span className="block text-[12.5px] text-muted">{logs.length} days and your settings{demo ? ' (demo data)' : ''}</span>
              </span>
            </button>
            <label className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-raised/40 min-h-[56px]">
              <Icon name="upload" className="text-muted" />
              <span className="flex-1">
                <span className="block text-[14.5px] font-medium">Import JSON</span>
                <span className="block text-[12.5px] text-muted">Replaces {demo ? 'demo' : 'all'} data after you confirm</span>
              </span>
              <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} aria-label="Choose a backup file to import" />
            </label>
          </div>
          {pending && (
            <div role="alertdialog" aria-labelledby="imp-h" className="mt-3 rounded-2xl border border-line px-4 py-4">
              <p id="imp-h" className="font-semibold">Replace {demo ? 'demo' : 'your'} data?</p>
              <p className="mt-1 text-[13.5px] text-muted">
                The backup has {pending.logs.length} days{pending.exportedAt ? ` from ${new Date(pending.exportedAt).toLocaleDateString()}` : ''}. Your current {logs.length} days will be replaced. Export first if unsure.
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn-primary flex-1" onClick={() => void confirmImport()}>Replace</button>
                <button type="button" className="btn-outline flex-1" onClick={() => setPending(null)}>Cancel</button>
              </div>
            </div>
          )}
          {msg && <p role="status" className={`mt-2 text-[13px] ${msg.tone === 'err' ? 'text-fg font-medium' : 'text-muted'}`}>{msg.text}</p>}
        </section>

        <section aria-labelledby="demo-h">
          <h2 id="demo-h" className="eyebrow mb-2">Demo</h2>
          <div className="card">
            <div className="flex items-center gap-3 px-4 py-2">
              <Icon name="flask" className="text-muted" />
              <div className="flex-1 py-1.5">
                <div className="text-[14.5px] font-medium">Load sample data</div>
                <div className="text-[12.5px] text-muted">Ten weeks of made-up training in a separate database. Your real logs are never touched.</div>
              </div>
              <Toggle checked={demo} onChange={(on) => void setDemo(on)} label="Demo mode with sample data" />
            </div>
          </div>
        </section>

        <StorageInfo />

        <section aria-labelledby="about-h" className="text-[12.5px] text-faint">
          <h2 id="about-h" className="sr-only">About</h2>
          <p>Lean Log keeps everything on this device in IndexedDB. No account, no server. Works offline once installed. Export regularly to keep a backup.</p>
        </section>
      </div>
    </div>
  );
}

const fmtBytes = (b: number) => (b < 1024 ? `${b} B` : b < 1024 ** 2 ? `${(b / 1024).toFixed(1)} KB` : b < 1024 ** 3 ? `${(b / 1024 ** 2).toFixed(1)} MB` : `${(b / 1024 ** 3).toFixed(1)} GB`);

/** Where workouts live and how much room they take, plus a request to keep the data from being evicted. */
function StorageInfo() {
  const { logs, settings, demo } = useStore();
  const [est, setEst] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const dataBytes = useMemo(() => new Blob([JSON.stringify({ logs, settings })]).size, [logs, settings]);
  const workouts = logs.filter((l) => Object.keys(l.ex).length > 0).length;
  const perDay = logs.length ? dataBytes / logs.length : 0;

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setEst({ usage: e.usage ?? 0, quota: e.quota ?? 0 })).catch(() => undefined);
    navigator.storage?.persisted?.().then(setPersisted).catch(() => undefined);
  }, [logs.length]);

  const rows: [string, string][] = [
    ['Where', `This ${/iPhone|iPad|Android/i.test(navigator.userAgent) ? 'phone' : 'device'}, inside this browser’s private app storage (IndexedDB)${demo ? ', demo database' : ''}`],
    ['Days saved', `${logs.length} (${workouts} with workouts)`],
    ['Your data', `${fmtBytes(dataBytes)}${perDay ? `, about ${fmtBytes(Math.round(perDay))} per day` : ''}`],
    ['A year of training', `about ${fmtBytes(Math.round((perDay || 1500) * 365))}`],
    ...(est ? ([['App total', `${fmtBytes(est.usage)} used, includes the offline app files`], ['Space available', fmtBytes(est.quota)]] as [string, string][]) : []),
  ];

  return (
    <section aria-labelledby="storage-h">
      <h2 id="storage-h" className="eyebrow mb-2">Storage</h2>
      <div className="card">
        <dl className="divide-y divide-line/70">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-3 px-4 py-2.5 text-[13.5px]">
              <dt className="w-[42%] shrink-0 text-muted">{k}</dt>
              <dd className="flex-1">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center gap-3 border-t border-line/70 px-4 py-3">
          <div className="flex-1">
            <div className="text-[14.5px] font-medium">{persisted ? 'Protected from clean-up' : 'Keep data safe'}</div>
            <div className="text-[12.5px] text-muted">
              {persisted
                ? 'The browser won’t delete this data to free space.'
                : 'Asks the browser not to clear this data when the phone is low on space. Installing the app usually grants it.'}
            </div>
          </div>
          {!persisted && navigator.storage?.persist && (
            <button type="button" className="btn-outline !min-h-[40px] !px-3 text-[13.5px]" onClick={() => void navigator.storage.persist().then(setPersisted)}>
              Protect
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-[12.5px] text-faint">Nothing is uploaded anywhere. Each person who installs Lean Log has their own separate data on their own phone. Clearing site data or uninstalling deletes it, so export a backup now and then.</p>
    </section>
  );
}
