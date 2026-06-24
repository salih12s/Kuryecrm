import AdminLayout from '../../components/admin/AdminLayout';

const FLOW = [
  {
    number: '1',
    title: 'Kayıtları hazırlayın',
    description: 'Önce çalışacağınız restoranları ve kuryeleri sisteme ekleyin.',
  },
  {
    number: '2',
    title: 'Vardiyayı planlayın',
    description: 'Restoran, kurye, tarih ve çalışma saatini seçerek vardiya oluşturun.',
  },
  {
    number: '3',
    title: 'Çalışmayı onaylayın',
    description: 'Tamamlanan vardiyanın gerçek saatlerini kontrol edin ve kesinleştirin.',
  },
  {
    number: '4',
    title: 'Rapor ve ödemeleri yönetin',
    description: 'Onaylı çalışma üzerinden hak edişleri, cari bakiyeleri ve kârlılığı takip edin.',
  },
];

const ROLES = [
  {
    title: 'Yönetici',
    badge: 'Tüm sistemi görür',
    description: 'Restoranları, kuryeleri, vardiyaları, raporları ve finans kayıtlarını yönetir.',
    items: ['Kayıt ekler ve düzenler', 'Vardiyaları planlar ve onaylar', 'Ödeme ve cari kayıtlarını yönetir', 'Tüm raporları görür'],
  },
  {
    title: 'Restoran',
    badge: 'Yalnızca kendi bilgilerini görür',
    description: 'Kendisine ait çalışma ve hesap bilgilerini takip eder.',
    items: ['Kendi vardiyalarını görür', 'Çalışma saatlerini kontrol eder', 'Kendi cari durumunu ve ödemelerini görür'],
  },
  {
    title: 'Kurye',
    badge: 'Yalnızca kendi bilgilerini görür',
    description: 'Kendisine atanan işleri ve kazanç durumunu takip eder.',
    items: ['Kendi vardiyalarını görür', 'Çalışma bilgilerini kontrol eder', 'Hak ediş, avans, ödeme ve kalan alacağını görür'],
  },
];

const MENU_GROUPS = [
  {
    title: 'Operasyon',
    description: 'Günlük işi planladığınız ve yönettiğiniz alan.',
    items: [
      ['Vardiyalar', 'Restoran ile kuryeyi eşleştirir; çalışma tarih ve saatlerini yönetir.'],
      ['Restoranlar', 'Müşteri restoranların iletişim, ücret ve giriş bilgilerini tutar.'],
      ['Kuryeler', 'Kuryelerin iletişim, saatlik ücret ve giriş bilgilerini tutar.'],
    ],
  },
  {
    title: 'Raporlar',
    description: 'Çalışmanın sonucunu ve performansı gösteren alan.',
    items: [
      ['Gün Sonu', 'Seçilen bir günün vardiya, gelir, gider ve ödeme özetini gösterir.'],
      ['Dönem Raporu', 'Haftalık, aylık veya özel tarih aralığındaki genel sonucu gösterir.'],
      ['Restoran Raporu', 'Her restoranın çalışma, fatura, ödeme ve kalan bakiyesini gösterir.'],
      ['Kurye Raporu', 'Her kuryenin çalışma, hak ediş, avans ve kalan alacağını gösterir.'],
    ],
  },
  {
    title: 'Finans',
    description: 'Para hareketlerini ve açık hesapları yönettiğiniz alan.',
    items: [
      ['Gelir / Gider', 'İşletmenin vardiya dışındaki gelir ve gider kayıtlarını tutar.'],
      ['Restoran Cari', 'Restoranlara kesilen faturaları, tahsilatları ve kalan borcu takip eder.'],
      ['Kurye Ödemeleri', 'Kuryelere yapılan ödemeleri kaydeder ve kalan alacağı günceller.'],
      ['Avanslar', 'Kuryelere verilen avansları kaydeder ve hak edişten düşülecek tutarı takip eder.'],
    ],
  },
];

export default function SystemGuidePage() {
  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <p className="text-sm font-semibold text-accent">KURYECRM REHBERİ</p>
          <h1 className="mt-1 text-2xl font-bold text-primary">Sistem nasıl çalışır?</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            KuryeCrm; restoran, kurye ve vardiya bilgilerini tek yerde toplar. Onaylanan
            çalışmalar üzerinden hak ediş, cari bakiye, ödeme ve kârlılık hesaplarını takip etmenizi sağlar.
          </p>
        </div>

        <section>
          <SectionTitle title="Temel iş akışı" description="Sistemi kullanırken izleyeceğiniz dört ana adım." />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FLOW.map((step) => (
              <article key={step.number} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 font-bold text-accent">
                  {step.number}
                </span>
                <h3 className="mt-4 font-semibold text-primary">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle title="Kim, neyi görür?" description="Her kullanıcı yalnızca kendi işi için gerekli alanlara ulaşır." />
          <div className="grid gap-4 lg:grid-cols-3">
            {ROLES.map((role) => (
              <article key={role.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-primary">{role.title}</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-muted">{role.badge}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{role.description}</p>
                <ul className="mt-4 space-y-2">
                  {role.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-text">
                      <span className="mt-0.5 text-success" aria-hidden="true">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle title="Menüler ne işe yarar?" description="Yönetici panelindeki alanların kısa açıklaması." />
          <div className="space-y-4">
            {MENU_GROUPS.map((group) => (
              <article key={group.title} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                  <h3 className="font-semibold text-primary">{group.title}</h3>
                  <p className="mt-1 text-sm text-muted">{group.description}</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.items.map(([title, description]) => (
                    <div key={title} className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr] sm:gap-4">
                      <p className="text-sm font-semibold text-text">{title}</p>
                      <p className="text-sm leading-6 text-muted">{description}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <h2 className="font-semibold text-primary">Kısa hatırlatma</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Finansal sonuçların doğru oluşması için tamamlanan vardiyaların kontrol edilip onaylanması önemlidir.
            Raporlar ve hak edişler, kesinleşen çalışma bilgilerini esas alır.
          </p>
        </aside>
      </div>
    </AdminLayout>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}
