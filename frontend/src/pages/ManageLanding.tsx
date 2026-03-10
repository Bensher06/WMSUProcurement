import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { landingAPI } from '../lib/supabaseApi';
import type {
  LandingContent,
  LandingTransparency,
  LandingBidding,
  LandingDocuments,
  LandingPlanning,
  LandingVendor,
  LandingBac,
  LandingBiddingRow,
  LandingDocumentItem
} from '../types/database';
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  FileText,
  Gavel,
  Download,
  Users,
  MapPin
} from 'lucide-react';

const defaultTransparency: LandingTransparency = {
  mission: '',
  ctaPrimary: { label: 'Active Bidding', url: '/login', description: '' },
  ctaSecondary: { label: 'Supplemental / Bid Bulletins', url: '/login', description: '' }
};
const defaultBidding: LandingBidding = { rows: [] };
const defaultDocuments: LandingDocuments = { items: [] };
const defaultPlanning: LandingPlanning = {
  app: { title: 'APP (Annual Procurement Plan)', description: '', url: '' },
  pmr: { title: 'PMR (Procurement Monitoring Report)', description: '', url: '' }
};
const defaultVendor: LandingVendor = {
  accreditationTitle: 'Accreditation Portal',
  accreditationDescription: '',
  accreditationUrl: '/login',
  loginTitle: 'Login for Registered Suppliers',
  loginDescription: '',
  loginUrl: '/login'
};
const defaultBac: LandingBac = {
  secretariatName: 'Procurement Office',
  secretariatEmail: 'procurement@wmsu.edu.ph',
  secretariatPhone: '991-1771',
  officeAddress: 'Western Mindanao State University, Normal Road, Baliwasan, Zamboanga City',
  officeNote: ''
};

type SectionKey = 'transparency' | 'bidding' | 'documents' | 'planning' | 'vendor' | 'bac';

export default function ManageLanding() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [content, setContent] = useState<LandingContent>({});
  const [activeSection, setActiveSection] = useState<SectionKey>('transparency');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const data = await landingAPI.getAll();
      setContent(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load landing content');
    } finally {
      setLoading(false);
    }
  };

  const saveSection = async (section: SectionKey, data: unknown) => {
    setError('');
    setSuccess('');
    setSaving(section);
    try {
      await landingAPI.updateSection(section, data);
      setContent((prev) => ({ ...prev, [section]: data }));
      setSuccess('Saved.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  if (!isAdmin()) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-gray-600">
        Only administrators can manage the landing page.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  const transparency = (content.transparency ?? defaultTransparency) as LandingTransparency;
  const bidding = (content.bidding ?? defaultBidding) as LandingBidding;
  const documents = (content.documents ?? defaultDocuments) as LandingDocuments;
  const planning = (content.planning ?? defaultPlanning) as LandingPlanning;
  const vendor = (content.vendor ?? defaultVendor) as LandingVendor;
  const bac = (content.bac ?? defaultBac) as LandingBac;

  const sections: { key: SectionKey; label: string; icon: typeof FileText }[] = [
    { key: 'transparency', label: 'Transparency Seal', icon: Gavel },
    { key: 'bidding', label: 'Live Bidding Board', icon: FileText },
    { key: 'documents', label: 'Procurement Documents', icon: Download },
    { key: 'planning', label: 'Planning & Reporting', icon: FileText },
    { key: 'vendor', label: 'Vendor Corner', icon: Users },
    { key: 'bac', label: 'BAC Directory', icon: MapPin }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-wmsu-black">Manage Landing Page</h1>
        <p className="text-base text-gray-500 mt-1">Edit content shown on the public landing page.</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {sections.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSection(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSection === key
                ? 'bg-red-900 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {activeSection === 'transparency' && (
          <TransparencyForm
            data={transparency}
            onSave={(data) => saveSection('transparency', data)}
            saving={saving === 'transparency'}
          />
        )}
        {activeSection === 'bidding' && (
          <BiddingForm
            data={bidding}
            onSave={(data) => saveSection('bidding', data)}
            saving={saving === 'bidding'}
          />
        )}
        {activeSection === 'documents' && (
          <DocumentsForm
            data={documents}
            onSave={(data) => saveSection('documents', data)}
            saving={saving === 'documents'}
          />
        )}
        {activeSection === 'planning' && (
          <PlanningForm
            data={planning}
            onSave={(data) => saveSection('planning', data)}
            saving={saving === 'planning'}
          />
        )}
        {activeSection === 'vendor' && (
          <VendorForm
            data={vendor}
            onSave={(data) => saveSection('vendor', data)}
            saving={saving === 'vendor'}
          />
        )}
        {activeSection === 'bac' && (
          <BacForm data={bac} onSave={(data) => saveSection('bac', data)} saving={saving === 'bac'} />
        )}
      </div>
    </div>
  );
}

function TransparencyForm({
  data,
  onSave,
  saving
}: {
  data: LandingTransparency;
  onSave: (d: LandingTransparency) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(data);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mission statement</label>
        <textarea
          value={form.mission}
          onChange={(e) => setForm((f) => ({ ...f, mission: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows={3}
          placeholder="Accountable and Transparent Governance..."
        />
      </div>
      <div className="space-y-6">
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50/50 space-y-3">
          <p className="text-sm font-medium text-gray-700">Card 1 (Primary CTA)</p>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Label</label>
            <input
              type="text"
              value={form.ctaPrimary.label}
              onChange={(e) => setForm((f) => ({ ...f, ctaPrimary: { ...f.ctaPrimary, label: e.target.value } }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g. Active Bidding"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Description (shown on card)</label>
            <textarea
              value={form.ctaPrimary.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, ctaPrimary: { ...f.ctaPrimary, description: e.target.value } }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
              placeholder="Short description for the card"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">URL</label>
            <input
              type="text"
              value={form.ctaPrimary.url}
              onChange={(e) => setForm((f) => ({ ...f, ctaPrimary: { ...f.ctaPrimary, url: e.target.value } }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50/50 space-y-3">
          <p className="text-sm font-medium text-gray-700">Card 2 (Secondary CTA)</p>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Label</label>
            <input
              type="text"
              value={form.ctaSecondary.label}
              onChange={(e) => setForm((f) => ({ ...f, ctaSecondary: { ...f.ctaSecondary, label: e.target.value } }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g. Supplemental / Bid Bulletins"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Description (shown on card)</label>
            <textarea
              value={form.ctaSecondary.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, ctaSecondary: { ...f.ctaSecondary, description: e.target.value } }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
              placeholder="Short description for the card"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">URL</label>
            <input
              type="text"
              value={form.ctaSecondary.url}
              onChange={(e) => setForm((f) => ({ ...f, ctaSecondary: { ...f.ctaSecondary, url: e.target.value } }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>
      <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Transparency
      </button>
    </form>
  );
}

function BiddingForm({
  data,
  onSave,
  saving
}: {
  data: LandingBidding;
  onSave: (d: LandingBidding) => void;
  saving: boolean;
}) {
  const [rows, setRows] = useState<LandingBiddingRow[]>(
    (data.rows || []).map((r) => ({
      ...r,
      abc: typeof r.abc === 'number' && !Number.isNaN(r.abc) ? r.abc : Math.floor(Number(r.abc)) || 0
    }))
  );

  const addRow = () => {
    setRows((r) => [...r, { projectTitle: '', abc: 0, referenceNo: '', closingDate: '' }]);
  };
  const removeRow = (i: number) => {
    setRows((r) => r.filter((_, j) => j !== i));
  };
  const updateRow = (i: number, field: keyof LandingBiddingRow, value: string | number) => {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Add or edit rows for the Live Bidding Board table.</p>
        <button type="button" onClick={addRow} className="flex items-center gap-1 text-red-900 font-medium">
          <Plus className="w-4 h-4" /> Add row
        </button>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-end border-b pb-3">
          <div className="col-span-5">
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Project Title</label>
            <input
              value={row.projectTitle}
              onChange={(e) => updateRow(i, 'projectTitle', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-0.5">ABC</label>
            <div className="flex items-center border border-gray-300 rounded text-sm bg-white">
              <span className="pl-2 py-1.5 text-gray-600 shrink-0">₱</span>
              <input
                type="number"
                min={0}
                step={1}
                value={typeof row.abc === 'number' && !Number.isNaN(row.abc) ? row.abc : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  const n = v === '' ? 0 : Math.floor(Number(v)) || 0;
                  updateRow(i, 'abc', n);
                }}
                className="input-no-spinner w-full py-1.5 pr-2 border-0 rounded-r text-sm focus:ring-0 focus:outline-none"
              />
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Reference No.</label>
            <input
              value={row.referenceNo}
              onChange={(e) => updateRow(i, 'referenceNo', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Closing Date</label>
            <input
              type="date"
              value={row.closingDate && /^\d{4}-\d{2}-\d{2}$/.test(row.closingDate) ? row.closingDate : ''}
              onChange={(e) => updateRow(i, 'closingDate', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="col-span-1">
            <button type="button" onClick={() => removeRow(i)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onSave({ rows })}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Bidding Board
      </button>
    </div>
  );
}

function DocumentsForm({
  data,
  onSave,
  saving
}: {
  data: LandingDocuments;
  onSave: (d: LandingDocuments) => void;
  saving: boolean;
}) {
  const [items, setItems] = useState<LandingDocumentItem[]>(data.items || []);

  const addItem = () => {
    setItems((i) => [...i, { title: '', description: '', url: '', category: 'pbd' }]);
  };
  const removeItem = (idx: number) => {
    setItems((i) => i.filter((_, j) => j !== idx));
  };
  const updateItem = (idx: number, field: keyof LandingDocumentItem, value: string) => {
    setItems((i) => i.map((item, j) => (j === idx ? { ...item, [field]: value } : item)));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Download links for Procurement Documents.</p>
        <button type="button" onClick={addItem} className="flex items-center gap-1 text-red-900 font-medium">
          <Plus className="w-4 h-4" /> Add document
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex justify-between">
            <input
              value={item.title}
              onChange={(e) => updateItem(i, 'title', e.target.value)}
              placeholder="Title"
              className="flex-1 px-2 py-1 border border-gray-300 rounded mr-2"
            />
            <select
              value={item.category}
              onChange={(e) => updateItem(i, 'category', e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded"
            >
              <option value="pbd">PBDs</option>
              <option value="technical">Technical</option>
              <option value="standard">Standard Forms</option>
            </select>
            <button type="button" onClick={() => removeItem(i)} className="p-1 text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <input
            value={item.description}
            onChange={(e) => updateItem(i, 'description', e.target.value)}
            placeholder="Short description"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
          <input
            value={item.url}
            onChange={(e) => updateItem(i, 'url', e.target.value)}
            placeholder="URL (e.g. /documents/file.pdf)"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onSave({ items })}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Documents
      </button>
    </div>
  );
}

function PlanningForm({
  data,
  onSave,
  saving
}: {
  data: LandingPlanning;
  onSave: (d: LandingPlanning) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(data);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-6"
    >
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">APP (Annual Procurement Plan)</h3>
        <input
          type="text"
          value={form.app.title}
          onChange={(e) => setForm((f) => ({ ...f, app: { ...f.app, title: e.target.value } }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
          placeholder="Title"
        />
        <input
          type="text"
          value={form.app.description}
          onChange={(e) => setForm((f) => ({ ...f, app: { ...f.app, description: e.target.value } }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
          placeholder="Description"
        />
        <input
          type="text"
          value={form.app.url}
          onChange={(e) => setForm((f) => ({ ...f, app: { ...f.app, url: e.target.value } }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="URL"
        />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">PMR (Procurement Monitoring Report)</h3>
        <input
          type="text"
          value={form.pmr.title}
          onChange={(e) => setForm((f) => ({ ...f, pmr: { ...f.pmr, title: e.target.value } }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
          placeholder="Title"
        />
        <input
          type="text"
          value={form.pmr.description}
          onChange={(e) => setForm((f) => ({ ...f, pmr: { ...f.pmr, description: e.target.value } }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
          placeholder="Description"
        />
        <input
          type="text"
          value={form.pmr.url}
          onChange={(e) => setForm((f) => ({ ...f, pmr: { ...f.pmr, url: e.target.value } }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="URL"
        />
      </div>
      <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Planning
      </button>
    </form>
  );
}

function VendorForm({
  data,
  onSave,
  saving
}: {
  data: LandingVendor;
  onSave: (d: LandingVendor) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(data);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Accreditation title</label>
        <input
          type="text"
          value={form.accreditationTitle}
          onChange={(e) => setForm((f) => ({ ...f, accreditationTitle: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Accreditation description</label>
        <input
          type="text"
          value={form.accreditationDescription}
          onChange={(e) => setForm((f) => ({ ...f, accreditationDescription: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Accreditation URL</label>
        <input
          type="text"
          value={form.accreditationUrl}
          onChange={(e) => setForm((f) => ({ ...f, accreditationUrl: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Login title</label>
        <input
          type="text"
          value={form.loginTitle}
          onChange={(e) => setForm((f) => ({ ...f, loginTitle: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Login description</label>
        <input
          type="text"
          value={form.loginDescription}
          onChange={(e) => setForm((f) => ({ ...f, loginDescription: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Login URL</label>
        <input
          type="text"
          value={form.loginUrl}
          onChange={(e) => setForm((f) => ({ ...f, loginUrl: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Vendor Corner
      </button>
    </form>
  );
}

function BacForm({
  data,
  onSave,
  saving
}: {
  data: LandingBac;
  onSave: (d: LandingBac) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(data);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">BAC Secretariat name</label>
        <input
          type="text"
          value={form.secretariatName}
          onChange={(e) => setForm((f) => ({ ...f, secretariatName: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="text"
          value={form.secretariatEmail}
          onChange={(e) => setForm((f) => ({ ...f, secretariatEmail: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input
          type="text"
          value={form.secretariatPhone}
          onChange={(e) => setForm((f) => ({ ...f, secretariatPhone: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Office address</label>
        <textarea
          value={form.officeAddress}
          onChange={(e) => setForm((f) => ({ ...f, officeAddress: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows={2}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Office note (e.g. sealed bids)</label>
        <input
          type="text"
          value={form.officeNote}
          onChange={(e) => setForm((f) => ({ ...f, officeNote: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save BAC Directory
      </button>
    </form>
  );
}
