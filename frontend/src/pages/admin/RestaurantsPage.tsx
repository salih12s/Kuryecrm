import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/admin/AdminLayout';
import ListToolbar from '../../components/admin/ListToolbar';
import StatusBadge from '../../components/admin/StatusBadge';
import Field from '../../components/admin/Field';
import Modal from '../../components/Modal';
import { restaurantsApi } from '../../lib/adminApi';
import { formatTL } from '../../lib/format';
import type { AdminRestaurant, StatusFilter } from '../../types';
import PhoneField from '../../components/admin/PhoneField';

interface FormState {
  name: string;
  authorizedPerson: string;
  phone: string;
  address: string;
  hourlyRate: string;
  email: string;
  password: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: '',
  authorizedPerson: '',
  phone: '',
  address: '',
  hourlyRate: '',
  email: '',
  password: '',
  isActive: true,
};

export default function RestaurantsPage() {
  const [rows, setRows] = useState<AdminRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRestaurant | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await restaurantsApi.list({ search, status });
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Reload on filter/search change (debounced for search).
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

  const openEdit = (r: AdminRestaurant) => {
    setEditing(r);
    setForm({
      name: r.name,
      authorizedPerson: r.authorizedPerson,
      phone: r.phone,
      address: r.address,
      hourlyRate: r.hourlyRate,
      email: r.email,
      password: '',
      isActive: r.isActive,
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
        authorizedPerson: form.authorizedPerson,
        phone: form.phone,
        address: form.address,
        hourlyRate: Number(form.hourlyRate),
        email: form.email,
        password: form.password, // empty => stripped by adminApi.clean on update
        isActive: form.isActive,
      };
      if (editing) {
        await restaurantsApi.update(editing.id, payload);
      } else {
        await restaurantsApi.create(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (r: AdminRestaurant) => {
    try {
      await restaurantsApi.setStatus(r.id, !r.isActive);
      await load();
    } catch (err) {
      alert(extractError(err));
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Restoranlar</h1>
        <p className="mt-1 text-sm text-muted">Restoran hesaplarını yönetin.</p>
      </div>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        onAdd={openCreate}
        addLabel="Yeni Restoran Ekle"
        searchPlaceholder="Restoran, yetkili, telefon ara..."
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Restoran Adı</th>
                <th className="px-4 py-3 font-medium">Yetkili Kişi</th>
                <th className="px-4 py-3 font-medium">Telefon</th>
                <th className="px-4 py-3 font-medium">Saatlik Ücret</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Yükleniyor...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{r.name}</td>
                    <td className="px-4 py-3 text-muted">{r.authorizedPerson}</td>
                    <td className="px-4 py-3 text-muted">{r.phone}</td>
                    <td className="px-4 py-3 text-text">{formatTL(r.hourlyRate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge active={r.isActive} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(r)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-text hover:bg-slate-100"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => toggleStatus(r)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
                            r.isActive
                              ? 'bg-danger hover:bg-danger/90'
                              : 'bg-success hover:bg-success/90'
                          }`}
                        >
                          {r.isActive ? 'Pasife Al' : 'Aktif Et'}
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
        title={editing ? 'Restoran Düzenle' : 'Yeni Restoran Ekle'}
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
              label="Restoran Adı"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Field
              label="Yetkili Kişi"
              required
              value={form.authorizedPerson}
              onChange={(e) => setForm({ ...form, authorizedPerson: e.target.value })}
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
          </div>
          <Field
            label="Adres"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="E-posta"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Field
              label="Şifre"
              type="password"
              required={!editing}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              hint={editing ? 'Boş bırakılırsa şifre değişmez.' : 'En az 6 karakter.'}
            />
          </div>
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
