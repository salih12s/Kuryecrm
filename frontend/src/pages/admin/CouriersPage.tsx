import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../../components/admin/AdminLayout';
import ListToolbar from '../../components/admin/ListToolbar';
import StatusBadge from '../../components/admin/StatusBadge';
import Field from '../../components/admin/Field';
import Modal from '../../components/Modal';
import { couriersApi } from '../../lib/adminApi';
import { formatTL } from '../../lib/format';
import type { AdminCourier, StatusFilter } from '../../types';
import PhoneField from '../../components/admin/PhoneField';

interface FormState {
  name: string;
  phone: string;
  hourlyRate: string;
  email: string;
  password: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: '',
  phone: '',
  hourlyRate: '',
  email: '',
  password: '',
  isActive: true,
};

export default function CouriersPage() {
  const [rows, setRows] = useState<AdminCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCourier | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await couriersApi.list({ search, status });
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (c: AdminCourier) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone,
      hourlyRate: c.hourlyRate,
      email: c.email,
      password: '',
      isActive: c.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        hourlyRate: Number(form.hourlyRate),
        email: form.email,
        password: form.password,
        isActive: form.isActive,
      };
      if (editing) {
        await couriersApi.update(editing.id, payload);
      } else {
        await couriersApi.create(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (c: AdminCourier) => {
    try {
      await couriersApi.setStatus(c.id, !c.isActive);
      await load();
    } catch (err) {
      alert(extractError(err));
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Kuryeler</h1>
        <p className="mt-1 text-sm text-muted">Kurye hesaplarını yönetin.</p>
      </div>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        onAdd={openCreate}
        addLabel="Yeni Kurye Ekle"
        searchPlaceholder="Kurye, telefon, e-posta ara..."
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Kurye Adı</th>
                <th className="px-4 py-3 font-medium">Telefon</th>
                <th className="px-4 py-3 font-medium">Saatlik Ücret</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    Yükleniyor...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{c.name}</td>
                    <td className="px-4 py-3 text-muted">{c.phone}</td>
                    <td className="px-4 py-3 text-text">{formatTL(c.hourlyRate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge active={c.isActive} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/admin/courier-payments?courierId=${c.id}`}
                          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white"
                        >
                          Ödeme Yap
                        </Link>
                        <Link
                          to={`/admin/couriers/${c.id}/account`}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-text hover:bg-slate-100"
                        >
                          Hesap Özeti
                        </Link>
                        <button
                          onClick={() => openEdit(c)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-text hover:bg-slate-100"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => toggleStatus(c)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
                            c.isActive
                              ? 'bg-danger hover:bg-danger/90'
                              : 'bg-success hover:bg-success/90'
                          }`}
                        >
                          {c.isActive ? 'Pasife Al' : 'Aktif Et'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Kurye Düzenle' : 'Yeni Kurye Ekle'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Kurye Adı"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <PhoneField
              required
              value={form.phone}
              onValueChange={(phone) => setForm({ ...form, phone })}
            />
            <Field
              label="Saatlik Ücret (₺)"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.hourlyRate}
              onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
            />
            <Field
              label="E-posta"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <Field
            label="Şifre"
            type="password"
            required={!editing}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            hint={editing ? 'Boş bırakılırsa şifre değişmez.' : 'En az 6 karakter.'}
          />
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
            />
            Aktif
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
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
