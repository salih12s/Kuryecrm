import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/admin/AdminLayout';
import Field from '../../components/admin/Field';
import { settingsApi } from '../../lib/adminApi';

export default function SettingsPage() {
  const [interval, setIntervalSec] = useState('20');
  const [offline, setOffline] = useState('90');
  const [partnersEdit, setPartnersEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const s = await settingsApi.get();
      setIntervalSec(s.courier_location_interval_seconds);
      setOffline(s.courier_offline_threshold_seconds);
      setPartnersEdit(s.partners_can_edit_finance === 'true');
    } catch {
      setError('Ayarlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await settingsApi.update({
        courier_location_interval_seconds: Number(interval),
        courier_offline_threshold_seconds: Number(offline),
        partners_can_edit_finance: partnersEdit ? 'true' : 'false',
      });
      setMessage('Ayarlar kaydedildi.');
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Sistem Ayarları</h1>
        <p className="mt-1 text-sm text-muted">Konum takibi ve yetki ayarlarını buradan yönetin.</p>
      </div>

      {loading ? (
        <p className="py-12 text-center text-muted">Yükleniyor...</p>
      ) : (
        <form onSubmit={submit} className="max-w-xl space-y-6">
          {message && (
            <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{message}</div>
          )}
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
          )}

          <section className="rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-text">Konum Takibi</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Gönderim Aralığı (saniye)"
                type="number"
                min="5"
                max="600"
                value={interval}
                onChange={(e) => setIntervalSec(e.target.value)}
                hint="Kurye konumunun gönderilme sıklığı (5-600 sn)."
              />
              <Field
                label="Çevrim Dışı Eşiği (saniye)"
                type="number"
                min="15"
                max="1800"
                value={offline}
                onChange={(e) => setOffline(e.target.value)}
                hint="Bu süreden eski konum 'çevrim dışı' sayılır."
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-text">Yetkilendirme</h2>
            <label className="flex items-center gap-3 text-sm text-text">
              <input
                type="checkbox"
                checked={partnersEdit}
                onChange={(e) => setPartnersEdit(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
              />
              Ortaklar finansal kayıtları düzenleyebilsin
            </label>
            <p className="mt-2 text-xs text-muted">
              Kapalıyken Ortaklar rolü yalnızca finansal verileri görüntüler; açıkken gelir/gider, ödeme vb. ekleyip
              düzenleyebilir.
            </p>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      )}
    </AdminLayout>
  );
}

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(' ');
    if (typeof msg === 'string') return msg;
  }
  return 'İşlem başarısız. Tekrar deneyin.';
}
