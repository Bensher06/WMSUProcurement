import { Link, useNavigate } from 'react-router-dom';
import { FileText, Download, Users, MapPin, Gavel, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { landingAPI } from '../lib/supabaseApi';
import type { LandingContent } from '../types/database';

function formatClosingDate(s: string): string {
  if (!s?.trim()) return s || '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [content, setContent] = useState<LandingContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    landingAPI.getAll().then(setContent).catch(() => setContent(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('landing-scrollbar-hidden');

    const onScroll = () => {
      setScrollY(window.scrollY);
      if (window.scrollY > 0) {
        html.classList.add('scrollbar-visible');
      } else {
        html.classList.remove('scrollbar-visible');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      html.classList.remove('landing-scrollbar-hidden', 'scrollbar-visible');
    };
  }, []);

  const heroOffset = Math.min(scrollY * 0.6, 120);
  const heroOpacity = Math.max(0, 1 - scrollY / 400);

  const t = content?.transparency;
  const docs = content?.documents?.items ?? [];
  const vendor = content?.vendor;
  const bac = content?.bac;

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between h-14 bg-red-900 border-b border-red-800 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/wmsu1.jpg" alt="WMSU" className="w-8 h-8 rounded-full object-cover border border-red-800" />
          <span className="font-bold text-white text-sm sm:text-base">WMSU-Procurement</span>
        </Link>
        <div className="hidden md:flex items-center gap-0 text-sm text-red-100">
          <a href="#hero" className="px-4 py-2 hover:bg-red-800 rounded transition-colors">Home</a>
          <span className="w-px h-5 bg-red-700" aria-hidden />
          <a href="#transparency" className="px-4 py-2 hover:bg-red-800 rounded transition-colors">Transparency</a>
          <span className="w-px h-5 bg-red-700" aria-hidden />
          <a href="#downloads" className="px-4 py-2 hover:bg-red-800 rounded transition-colors">Downloads</a>
          <span className="w-px h-5 bg-red-700" aria-hidden />
          <a href="#vendor" className="px-4 py-2 hover:bg-red-800 rounded transition-colors">Vendor Corner</a>
          <span className="w-px h-5 bg-red-700" aria-hidden />
          <Link to="/accreditation-portal" className="px-4 py-2 hover:bg-red-800 rounded transition-colors">Accreditation</Link>
          <span className="w-px h-5 bg-red-700" aria-hidden />
          <Link to="/login" className="px-4 py-2 hover:bg-red-800 rounded transition-colors font-medium text-white">Log in</Link>
        </div>
        <div className="flex md:hidden items-center gap-2">
          <Link to="/accreditation-portal" className="px-3 py-2 text-sm font-medium text-red-100 hover:bg-red-800 rounded">Accreditation</Link>
          <Link to="/login" className="px-3 py-2 text-sm font-medium text-white hover:bg-red-800 rounded">Log in</Link>
        </div>
      </nav>

      {/* Main content – grows to push footer to bottom */}
      <main className="flex-1">
      {/* Hero – scroll-animated */}
      <section id="hero" className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/wmsuimage.jpg)' }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-red-950/80" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" aria-hidden />

        <div
          className="relative z-10 text-center px-6 max-w-2xl transition-all duration-150 ease-out"
          style={{
            transform: `translateY(-${heroOffset}px)`,
            opacity: heroOpacity,
          }}
        >
          <img
            src="/wmsu1.jpg"
            alt="WMSU"
            className="w-24 h-24 rounded-full object-cover shadow-lg mx-auto mb-8 border-4 border-white/30"
          />
          <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-md tracking-tight">
            Western Mindanao State University
          </h1>
          <p className="mt-4 text-2xl sm:text-3xl font-semibold text-red-100 drop-shadow-md">
            Procurement Office
          </p>
          <p className="mt-6 text-red-200/90 text-lg">
            WMSU-Procurement · A Smart Research University by 2040
          </p>
        </div>
      </section>

      {/* 1. Transparency Seal — mission, 2 cards, + optional featured item */}
      <section id="transparency" className="py-16 sm:py-24 px-4 sm:px-6 bg-white border-t border-red-100">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-900 mb-6">
            <img
              src="/wmsu1.jpg"
              alt="WMSU"
              className="w-12 h-12 rounded-full object-cover border-2 border-white/70"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Transparency Seal</h2>
          {loading ? (
            <p className="mt-4 text-gray-500">Loading…</p>
          ) : (
            <>
              {t?.mission && (
                <p className="mt-4 text-gray-600 leading-relaxed max-w-2xl mx-auto">
                  {t.mission}
                </p>
              )}
              {/* Two fixed cards (not editable by admin) */}
              <div className="mt-10 grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
                <Link
                  to="/active-bidding"
                  className="group flex flex-col p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-red-900 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-red-900 text-white shrink-0">
                      <Gavel className="w-6 h-6" />
                    </span>
                    <h3 className="font-semibold text-gray-900 group-hover:text-gray-800">Active Bidding</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4 flex-1">View current active bidding opportunities and submit your bids.</p>
                  <span className="inline-flex items-center gap-2 text-gray-700 font-medium text-sm group-hover:underline">
                    Active Bidding
                    <span aria-hidden>→</span>
                  </span>
                </Link>
                <Link
                  to="/bid-bulletins"
                  className="group flex flex-col p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-red-900 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-red-900 text-white shrink-0">
                      <FileText className="w-6 h-6" />
                    </span>
                    <h3 className="font-semibold text-gray-900 group-hover:text-gray-800">Supplemental / Bid Bulletins</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4 flex-1">Access bid bulletins, supplements, and updates for ongoing procurements.</p>
                  <span className="inline-flex items-center gap-2 text-gray-700 font-medium text-sm group-hover:underline">
                    Supplemental / Bid Bulletins
                    <span aria-hidden>→</span>
                  </span>
                </Link>
              </div>
              {/* Saved transparency seal entries (from admin) — show all items from items[] */}
              {(() => {
                const itemsArray = Array.isArray(t?.items) ? t.items : [];
                const fallbackSingle = t?.featuredItem ? [{ featuredItem: t.featuredItem }] : [];
                const allEntries = (itemsArray.length > 0 ? itemsArray : fallbackSingle).filter(
                  (e): e is { featuredItem: NonNullable<typeof t>['featuredItem'] } => Boolean(e?.featuredItem)
                );
                const entries = allEntries.filter((e) => {
                  const s = (e.featuredItem?.status ?? 'Active').trim().toLowerCase();
                  return s === 'active';
                });
                if (entries.length === 0) return null;
                return (
                  <div className="mt-12 w-full max-w-4xl mx-auto">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 text-left">Live Bidding Board</h3>
                    <p className="text-sm text-gray-600 mb-3 text-left">Active opportunities only.</p>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-red-900/10 border-b border-red-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Project Title</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">ABC (₱)</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Reference No.</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Closing Date</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entries.map((e, i) => {
                                const f = e.featuredItem!;
                                const status = (f.status ?? 'Active').trim() || 'Active';
                                const isActive = status.toLowerCase() === 'active';
                                return (
                                  <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4 text-gray-800">{f.projectTitle ?? '—'}</td>
                                    <td className="py-3 px-4">
                                      {typeof f.abc === 'number' ? `₱${f.abc.toLocaleString()}` : (f.abc != null ? `₱${String(f.abc)}` : '—')}
                                    </td>
                                    <td className="py-3 px-4 font-mono text-gray-600">{f.referenceNo ?? '—'}</td>
                                    <td className="py-3 px-4">
                                      <span className="inline-flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />
                                        {formatClosingDate(f.closingDate ?? '') || '—'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${
                                          isActive ? 'bg-green-600' : 'bg-gray-500'
                                        }`}
                                      >
                                        {status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </section>

      {/* 2. Procurement Documents (Downloads) */}
      <section id="downloads" className="py-16 sm:py-24 px-4 sm:px-6 bg-white border-t border-red-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Procurement Documents</h2>
          <p className="text-gray-600 mb-8">Forms and documents required to participate in bidding.</p>
          {loading ? (
            <div className="text-center text-gray-500">Loading…</div>
          ) : docs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No documents listed yet.</div>
          ) : (
            <ul className="border border-red-200 rounded-xl divide-y divide-red-100 overflow-hidden">
              {docs.map((item, i) => (
                <li key={i}>
                  <a
                    href={item.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 hover:bg-red-50/50 transition-colors group"
                  >
                    <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-gray-700 group-hover:bg-red-100">
                      <Download className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-gray-800">{item.title || 'Untitled'}</h3>
                      {item.description && <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>}
                      {item.category && <span className="inline-block mt-1 text-xs text-gray-500 uppercase tracking-wide">{item.category}</span>}
                    </div>
                    <span className="flex-shrink-0 text-sm font-medium text-gray-700 group-hover:underline">Download</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 4. Planning & Reporting (static, not editable from landing) */}
      <section id="planning" className="py-16 sm:py-24 px-4 sm:px-6 bg-red-50/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Planning & Reporting</h2>
          <p className="text-gray-600 mb-8">Annual plans and historical procurement reports.</p>
          <div className="grid sm:grid-cols-2 gap-6">
            <Link to="/annual-procurement-plan" className="flex flex-col p-6 rounded-xl bg-white border border-gray-200 hover:border-red-900 hover:shadow-md transition-all group">
              <h3 className="font-semibold text-gray-900 group-hover:text-gray-800">APP (Annual Procurement Plan)</h3>
            </Link>
            <Link to="/bid-winners-awardees" className="flex flex-col p-6 rounded-xl bg-white border border-gray-200 hover:border-red-900 hover:shadow-md transition-all group">
              <h3 className="font-semibold text-gray-900 group-hover:text-gray-800">Bid Winners & Awardees</h3>
              <p className="text-sm text-gray-500 mt-1">PMR — How we select and award contracts</p>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Vendor Corner */}
      <section id="vendor" className="py-16 sm:py-24 px-4 sm:px-6 bg-white border-t border-red-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Vendor Corner</h2>
          <p className="text-gray-600 mb-8">Register and manage your participation in WMSU procurement.</p>
          {loading ? (
            <div className="text-center text-gray-500">Loading…</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {vendor?.accreditationTitle && (
                <Link
                  to="/accreditation-portal"
                  className="flex items-center gap-4 p-6 rounded-xl border-2 border-gray-200 hover:border-red-900 hover:bg-gray-50 transition-colors"
                >
                  <Users className="w-12 h-12 text-red-900 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{vendor.accreditationTitle}</h3>
                    <p className="mt-1 text-sm text-gray-600">{vendor.accreditationDescription}</p>
                  </div>
                </Link>
              )}
              {vendor?.loginTitle && (
                <Link
                  to="/supplier-register"
                  className="flex items-center gap-4 p-6 rounded-xl border-2 border-gray-200 hover:border-red-900 hover:bg-gray-50 transition-colors"
                >
                  <FileText className="w-12 h-12 text-red-900 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Register as Supplier</h3>
                    <p className="mt-1 text-sm text-gray-600">Register your company to participate in WMSU procurement opportunities</p>
                  </div>
                </Link>
              )}
              {!loading && !vendor?.accreditationTitle && !vendor?.loginTitle && (
                <div className="col-span-2 text-center text-gray-500 py-8">No vendor links configured yet.</div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 6. BAC Directory */}
      <section id="bac" className="py-16 sm:py-24 px-4 sm:px-6 bg-red-50/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">BAC Directory</h2>
          <p className="text-gray-600 mb-8">Contact the Bids and Awards Committee Secretariat.</p>
          {loading ? (
            <div className="text-center text-gray-500">Loading…</div>
          ) : (bac?.secretariatName || bac?.officeAddress) ? (
            <div className="grid sm:grid-cols-2 gap-8">
              {(bac?.secretariatName || bac?.secretariatEmail || bac?.secretariatPhone) && (
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-red-900" />
                    BAC Secretariat
                  </h3>
                  <ul className="mt-3 space-y-1 text-gray-600">
                    {bac.secretariatName && <li>{bac.secretariatName}</li>}
                    {bac.secretariatEmail && <li>{bac.secretariatEmail}</li>}
                    {bac.secretariatPhone && <li>📞 {bac.secretariatPhone}</li>}
                  </ul>
                </div>
              )}
              {(bac?.officeAddress || bac?.officeNote) && (
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-900" />
                    Office Location
                  </h3>
                  {bac.officeAddress && <p className="mt-3 text-gray-600 whitespace-pre-line">{bac.officeAddress}</p>}
                  {bac.officeNote && <p className="mt-2 text-sm text-gray-500">{bac.officeNote}</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">No BAC contact information configured yet.</div>
          )}
        </div>
      </section>
      </main>

      {/* Bottom footer – always at bottom of page */}
      <footer className="mt-auto py-8 px-4 bg-red-900 text-white text-center text-sm border-t border-red-800">
        Western Mindanao State University · Procurement Office · WMSU-Procurement © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
