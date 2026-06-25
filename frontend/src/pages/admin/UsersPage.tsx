import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/admin/AdminLayout';
import Field from '../../components/admin/Field';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../lib/adminApi';
import type { AdminUser, Role } from '../../types';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  KURYE_SEFI: 'Kurye Şefi',
  PARTNER: 'Ortak / Finans',
  RESTAURANT: 'Restoran',
  COURIER: 'Kurye',
};
const MANAGEMENT_ROLES: Role[] = ['ADMIN', 'KURYE_SEFI', 'PARTNER'];

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'KURYE_SEFI' as Role, isActive: true });

  const load = async () => {
    try {
      setRows(await usersApi.list());
      setError('');
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await usersApi.create(form);
      setModalOpen(false);
      setForm({ name: '', username: '', password: '', role: 'KURYE_SEFI', isActive: true });
      await load();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  };

  const update = async (target: AdminUser, changes: Partial<{ role: Role; isActive: boolean }>) => {
    setError('');
    try {
      const updated = await usersApi.update(target.id, changes);
      setRows((current) => current.map((item) => item.id === target.id ? updated : item));
    } catch (caught) {
      setError(messageOf(caught));
    }
  };

  const management = rows.filter((item) => !item.profile);
  const restaurants = rows.filter((item) => item.profile?.type === 'restaurant');
  const couriers = rows.filter((item) => item.profile?.type === 'courier');

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Kullanıcılar</h1>
          <p className="mt-1 text-sm text-muted">Hesapları, giriş yetkilerini ve yönetim rollerini belirleyin.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">
          + Yönetim Kullanıcısı
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger">{error}</div>}
      {loading ? <p className="py-12 text-center text-muted">Kullanıcılar yükleniyor...</p> : (
        <div className="space-y-6">
          <UserSection title="Yönetim Kullanıcıları" description="Admin, Kurye Şefi ve Ortak hesapları" rows={management} currentUserId={currentUser?.id} onUpdate={update} allowRole />
          <UserSection title="Restoran Kullanıcıları" description="Restoranlar sayfasından oluşturulan hesaplar" rows={restaurants} currentUserId={currentUser?.id} onUpdate={update} />
          <UserSection title="Kurye Kullanıcıları" description="Kuryeler sayfasından oluşturulan hesaplar" rows={couriers} currentUserId={currentUser?.id} onUpdate={update} />
        </div>
      )}

      <Modal open={modalOpen} title="Yönetim Kullanıcısı Oluştur" onClose={() => setModalOpen(false)}>
        <form onSubmit={create} className="space-y-4">
          <Field label="Ad Soyad" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Field label="Kullanıcı Adı" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Field label="Şifre" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Yetki / Rol</span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent">
              {MANAGEMENT_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </select>
          </label>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-muted">
            <b>Kurye Şefi:</b> restoran, kurye, vardiya ve canlı harita. <b>Ortak:</b> finans ve raporlar. <b>Admin:</b> tam yetki.
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Vazgeç</button>
            <button disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Oluşturuluyor...' : 'Oluştur'}</button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}

function UserSection({ title, description, rows, currentUserId, onUpdate, allowRole = false }: {
  title: string;
  description: string;
  rows: AdminUser[];
  currentUserId?: string;
  onUpdate: (user: AdminUser, changes: Partial<{ role: Role; isActive: boolean }>) => Promise<void>;
  allowRole?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-primary">{title} <span className="text-sm font-normal text-muted">({rows.length})</span></h2>
        <p className="text-xs text-muted">{description}</p>
      </div>
      {rows.length === 0 ? <p className="p-6 text-center text-sm text-muted">Henüz kullanıcı yok.</p> : (
        <>
        {/* Mobile: stacked cards */}
        <div className="space-y-3 p-4 md:hidden">
          {rows.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-text">{item.profile?.name ?? item.name}{item.id === currentUserId && <span className="ml-2 text-xs text-accent">Siz</span>}</p>
                  <p className="text-xs text-muted">@{item.username}</p>
                </div>
                <button disabled={item.id === currentUserId} onClick={() => void onUpdate(item, { isActive: !item.isActive })} className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-50 ${item.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{item.isActive ? 'Aktif' : 'Pasif'}</button>
              </div>
              <div className="mt-2">
                {allowRole ? <select value={item.role} disabled={item.id === currentUserId} onChange={(e) => void onUpdate(item, { role: e.target.value as Role })} className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs disabled:bg-slate-100">
                  {MANAGEMENT_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                </select> : <span className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-text">{ROLE_LABELS[item.role]}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-muted"><tr><th className="px-4 py-3 font-medium">Ad</th><th className="px-4 py-3 font-medium">Kullanıcı Adı</th><th className="px-4 py-3 font-medium">Yetki</th><th className="px-4 py-3 font-medium">Giriş Durumu</th></tr></thead>
            <tbody>{rows.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-text">{item.profile?.name ?? item.name}{item.id === currentUserId && <span className="ml-2 text-xs text-accent">Siz</span>}</td>
                <td className="px-4 py-3 text-muted">{item.username}</td>
                <td className="px-4 py-3">
                  {allowRole ? <select value={item.role} disabled={item.id === currentUserId} onChange={(e) => void onUpdate(item, { role: e.target.value as Role })} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs disabled:bg-slate-100">
                    {MANAGEMENT_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                  </select> : <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-text">{ROLE_LABELS[item.role]}</span>}
                </td>
                <td className="px-4 py-3"><button disabled={item.id === currentUserId} onClick={() => void onUpdate(item, { isActive: !item.isActive })} className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-50 ${item.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{item.isActive ? 'Aktif' : 'Pasif'}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}

function messageOf(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string') return message;
  }
  return 'İşlem tamamlanamadı. Tekrar deneyin.';
}
