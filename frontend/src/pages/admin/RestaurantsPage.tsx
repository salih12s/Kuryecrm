import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/admin/AdminLayout';
import ListToolbar from '../../components/admin/ListToolbar';
import Field from '../../components/admin/Field';
import Modal from '../../components/Modal';
import { restaurantsApi } from '../../lib/adminApi';
import { formatTL } from '../../lib/format';
import type { AdminRestaurant } from '../../types';
import PhoneField from '../../components/admin/PhoneField';
import { useAuth } from '../../context/AuthContext';
import LocationPicker from '../../components/map/LocationPicker';
import LocationView from '../../components/map/LocationView';

interface FormState {
  name: string;
  authorizedPerson: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  neighborhood: string;
  hourlyRate: string;
  username: string;
  password: string;
  location: { lat: number; lng: number } | null;
  locationNote: string;
}

const emptyForm: FormState = {
  name: '',
  authorizedPerson: '',
  phone: '',
  address: '',
  city: '',
  district: '',
  neighborhood: '',
  hourlyRate: '',
  username: '',
  password: '',
  location: null,
  locationNote: '',
};

interface AddressOption {
  id: number;
  name: string;
}

interface TurkeyApiResponse {
  data?: AddressOption[];
}

const addressSelectClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-slate-100';

function completeAddress(form: FormState): string {
  const parts = [
    form.address.trim(),
    form.neighborhood && `${form.neighborhood} Mahallesi`,
    form.district,
    form.city,
  ].filter(Boolean) as string[];
  const result: string[] = [];
  for (const part of parts) {
    if (!result.some((current) => current.toLocaleLowerCase('tr-TR').includes(part.toLocaleLowerCase('tr-TR')))) {
      result.push(part);
    }
  }
  return result.join(', ');
}

/** Only geographic fields are used for map search; apartment/block details
 * remain in the saved address but cannot make geocoding less accurate. */
function mapSearchAddress(form: FormState): string {
  return [
    form.address.trim(),
    form.neighborhood && `${form.neighborhood} Mahallesi`,
    form.district,
    form.city,
  ].filter(Boolean).join(', ');
}

export default function RestaurantsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [rows, setRows] = useState<AdminRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing] = useState<AdminRestaurant | null>(null);
  const [editing, setEditing] = useState<AdminRestaurant | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cities, setCities] = useState<AddressOption[]>([]);
  const [districts, setDistricts] = useState<AddressOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<AddressOption[]>([]);
  const [addressOptionsError, setAddressOptionsError] = useState('');

  useEffect(() => {
    fetch('https://api.turkiyeapi.dev/v1/provinces?fields=id,name')
      .then((response) => {
        if (!response.ok) throw new Error('province-list');
        return response.json() as Promise<TurkeyApiResponse>;
      })
      .then((result) => setCities(result.data ?? []))
      .catch(() => setAddressOptionsError('İl listesi alınamadı; açık adresle aramaya devam edebilirsiniz.'));
  }, []);

  useEffect(() => {
    if (!form.city) {
      setDistricts([]);
      return;
    }
    const controller = new AbortController();
    fetch(`https://api.turkiyeapi.dev/v1/districts?province=${encodeURIComponent(form.city)}&fields=id,name`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('district-list');
        return response.json() as Promise<TurkeyApiResponse>;
      })
      .then((result) => setDistricts(result.data ?? []))
      .catch((caught) => {
        if (!(caught instanceof DOMException && caught.name === 'AbortError')) setAddressOptionsError('İlçe listesi alınamadı.');
      });
    return () => controller.abort();
  }, [form.city]);

  useEffect(() => {
    if (!form.city || !form.district) {
      setNeighborhoods([]);
      return;
    }
    const controller = new AbortController();
    const query = `province=${encodeURIComponent(form.city)}&district=${encodeURIComponent(form.district)}&fields=id,name`;
    fetch(`https://api.turkiyeapi.dev/v1/neighborhoods?${query}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('neighborhood-list');
        return response.json() as Promise<TurkeyApiResponse>;
      })
      .then((result) => setNeighborhoods(result.data ?? []))
      .catch((caught) => {
        if (!(caught instanceof DOMException && caught.name === 'AbortError')) setAddressOptionsError('Mahalle listesi alınamadı.');
      });
    return () => controller.abort();
  }, [form.city, form.district]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await restaurantsApi.list({ search });
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Reload on search change (debounced).
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
      city: '',
      district: '',
      neighborhood: '',
      hourlyRate: r.hourlyRate,
      username: r.username,
      password: '',
      location: r.latitude != null && r.longitude != null ? { lat: r.latitude, lng: r.longitude } : null,
      locationNote: r.locationNote ?? '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.location) {
      setFormError('Restoranı kaydetmeden önce haritadan sabit konumunu seçin.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        authorizedPerson: form.authorizedPerson,
        phone: form.phone,
        address: completeAddress(form),
        hourlyRate: Number(form.hourlyRate),
        username: form.username,
        password: form.password, // empty => stripped by adminApi.clean on update
        latitude: form.location?.lat,
        longitude: form.location?.lng,
        locationNote: form.locationNote,
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

  const remove = async (r: AdminRestaurant) => {
    if (!window.confirm(`"${r.name}" restoranını ve tüm geçmişini (vardiya, fatura, ödeme) kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }
    try {
      await restaurantsApi.remove(r.id);
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
        onAdd={openCreate}
        addLabel="Yeni Restoran Ekle"
        searchPlaceholder="Restoran, yetkili, telefon, kullanıcı adı ara..."
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Restoran Adı</th>
                <th className="px-4 py-3 font-medium">Kullanıcı Adı</th>
                <th className="px-4 py-3 font-medium">Yetkili Kişi</th>
                <th className="px-4 py-3 font-medium">Telefon</th>
                <th className="px-4 py-3 font-medium">Konum</th>
                <th className="px-4 py-3 font-medium">Saatlik Ücret</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    Yükleniyor...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{r.name}</td>
                    <td className="px-4 py-3 text-muted">{r.username}</td>
                    <td className="px-4 py-3 text-muted">{r.authorizedPerson}</td>
                    <td className="px-4 py-3 text-muted">{r.phone}</td>
                    <td className="px-4 py-3 text-muted">
                      {r.latitude != null && r.longitude != null ? (
                        <button
                          type="button"
                          onClick={() => setViewing(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-success/30 bg-success/10 px-2 py-1 text-xs font-medium text-success hover:bg-success/20"
                          title="Konumu haritada gör"
                        >
                          📍 Haritada Gör
                        </button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text">{formatTL(r.hourlyRate)}</td>
                    <td className="px-4 py-3">
                      {r.approvalStatus === 'PENDING' ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          Onay Bekliyor
                        </span>
                      ) : r.approvalStatus === 'REJECTED' ? (
                        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">
                          Reddedildi
                        </span>
                      ) : (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                          Onaylı
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(r)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-text hover:bg-slate-100"
                        >
                          Düzenle
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => remove(r)}
                            className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10"
                          >
                            Sil
                          </button>
                        )}
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
        open={viewing != null}
        title={viewing ? `${viewing.name} — Konum` : 'Konum'}
        onClose={() => setViewing(null)}
      >
        {viewing?.latitude != null && viewing.longitude != null && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{viewing.address || '—'}</p>
            <LocationView
              lat={viewing.latitude}
              lng={viewing.longitude}
              label={viewing.name}
              note={viewing.locationNote}
            />
          </div>
        )}
      </Modal>

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium text-text">
              İl
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value, district: '', neighborhood: '' })}
                className={`mt-1 ${addressSelectClass}`}
              >
                <option value="">İl seçin</option>
                {cities.map((city) => <option key={city.id} value={city.name}>{city.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-text">
              İlçe
              <select
                value={form.district}
                disabled={!form.city}
                onChange={(e) => setForm({ ...form, district: e.target.value, neighborhood: '' })}
                className={`mt-1 ${addressSelectClass}`}
              >
                <option value="">İlçe seçin</option>
                {districts.map((district) => <option key={district.id} value={district.name}>{district.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-text">
              Mahalle
              <select
                value={form.neighborhood}
                disabled={!form.district}
                onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                className={`mt-1 ${addressSelectClass}`}
              >
                <option value="">Mahalle seçin</option>
                {neighborhoods.map((neighborhood) => <option key={neighborhood.id} value={neighborhood.name}>{neighborhood.name}</option>)}
              </select>
            </label>
          </div>
          {addressOptionsError && <p className="text-xs text-amber-700">{addressOptionsError}</p>}
          <Field
            label="Cadde / Sokak"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            hint="Örn. Gazi Mustafa Kemal Bulvarı"
          />

          <div>
            <span className="mb-1 block text-sm font-medium text-text">Konum (harita üzerinden)</span>
            <LocationPicker
              value={form.location}
              onChange={(location) => setForm({ ...form, location })}
              address={mapSearchAddress(form)}
              onAddressChange={(address) => setForm((current) => ({
                ...current,
                address,
                city: '',
                district: '',
                neighborhood: '',
              }))}
            />
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Enlem"
                type="number"
                step="any"
                value={form.location ? String(form.location.lat) : ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    location: { lat: Number(e.target.value), lng: form.location?.lng ?? 0 },
                  })
                }
                hint="Haritadan otomatik dolar."
              />
              <Field
                label="Boylam"
                type="number"
                step="any"
                value={form.location ? String(form.location.lng) : ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    location: { lat: form.location?.lat ?? 0, lng: Number(e.target.value) },
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Kullanıcı Adı"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              hint="Girişte kullanılır. Harf, rakam, . _ -"
            />
            <Field
              label="Şifre"
              type="password"
              required={!editing}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              hint={editing ? 'Boş bırakılırsa şifre değişmez.' : undefined}
            />
          </div>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Yeni kayıtlar admin onayından sonra listede görünür ve giriş yapabilir.
          </p>

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
