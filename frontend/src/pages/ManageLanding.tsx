import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { landingAPI, transparencySealAPI, bidBulletinsAPI, bidWinnersAPI, suppliersAPI } from '../lib/supabaseApi';
import { supabase } from '../lib/supabaseClient';
import type {
  LandingContent,
  LandingTransparency,
  TransparencyFeaturedItem,
  TransparencySealEntry,
  LandingDocuments,
  LandingPlanning,
  LandingVendor,
  LandingBac,
  LandingDocumentItem,
  BidBulletin,
  BidBulletinAttachment,
  BidWinnerWithSupplier
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
  MapPin,
  ArrowLeft,
  Pencil
} from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

const defaultFeaturedItem: TransparencyFeaturedItem = {
  projectTitle: '',
  referenceNo: '',
  abc: 0,
  closingDate: '',
  openingDate: '',
  location: '',
  description: '',
  requirements: [],
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  status: 'Active'
};

const defaultTransparency: LandingTransparency = {};
const defaultDocuments: LandingDocuments = { items: [] };
const defaultPlanning: LandingPlanning = { appItems: [] };
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

type SectionKey = 'transparency' | 'bulletins' | 'documents' | 'planning' | 'bac';

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

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 5000);
    return () => clearTimeout(timer);
  }, [success]);

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
  const documents = (content.documents ?? defaultDocuments) as LandingDocuments;
  const planning = (content.planning ?? defaultPlanning) as LandingPlanning;
  const bac = (content.bac ?? defaultBac) as LandingBac;

  const sections: { key: SectionKey; label: string; icon: typeof FileText }[] = [
    { key: 'transparency', label: 'Transparency Seal', icon: Gavel },
    { key: 'bulletins', label: 'Supplemental/ Bid Bulletins', icon: FileText },
    { key: 'documents', label: 'Procurement Documents', icon: Download },
    { key: 'planning', label: 'Planning & Reporting', icon: FileText },
    { key: 'bac', label: 'BAC Directory', icon: MapPin }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <CenteredAlert error={error || undefined} success={success || undefined} onClose={() => { setError(''); setSuccess(''); }} />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-wmsu-black">Manage Landing Page</h1>
        <p className="text-base text-gray-500 mt-1">Edit content shown on the public landing page.</p>
      </div>

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
            onAddEntry={async (entry) => {
              setSaving('transparency');
              setError('');
              setSuccess('');
              try {
                await transparencySealAPI.create(entry);
                const data = await landingAPI.getAll();
                setContent(data);
                setSuccess('Saved.');
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to save');
              } finally {
                setSaving(null);
              }
            }}
            onUpdateEntry={async (id, entry) => {
              setSaving('transparency');
              setError('');
              setSuccess('');
              try {
                await transparencySealAPI.update(id, entry);
                const data = await landingAPI.getAll();
                setContent(data);
                setSuccess('Saved.');
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to save');
              } finally {
                setSaving(null);
              }
            }}
            onDeleteEntry={async (id) => {
              setSaving('transparency');
              setError('');
              setSuccess('');
              try {
                await transparencySealAPI.delete(id);
                const data = await landingAPI.getAll();
                setContent(data);
                setSuccess('Deleted.');
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to delete');
              } finally {
                setSaving(null);
              }
            }}
            onDeleteLegacyEntry={async (idx) => {
              setSaving('transparency');
              setError('');
              setSuccess('');
              try {
                const nextItems = (transparency.items || []).filter((_, i) => i !== idx);
                const last = nextItems[nextItems.length - 1];
                await landingAPI.updateSection('transparency', {
                  ...transparency,
                  items: nextItems,
                  mission: last?.mission,
                  featuredItem: last?.featuredItem
                });
                const data = await landingAPI.getAll();
                setContent(data);
                setSuccess('Deleted.');
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to delete');
              } finally {
                setSaving(null);
              }
            }}
            saving={saving === 'transparency'}
          />
        )}
        {activeSection === 'bulletins' && (
          <BidBulletinsForm
            onSaveSuccess={() => setSuccess('Saved.')}
            onDeleteSuccess={() => setSuccess('Deleted.')}
            onError={(msg) => setError(msg)}
            saving={saving === 'bulletins'}
            setSaving={(v) => setSaving(v ? 'bulletins' : null)}
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
          <PlanningCards
            data={planning}
            onSave={(data) => saveSection('planning', data)}
            saving={saving === 'planning'}
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
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onDeleteLegacyEntry,
  saving
}: {
  data: LandingTransparency;
  onAddEntry: (entry: TransparencySealEntry) => Promise<void>;
  onUpdateEntry: (id: string, entry: TransparencySealEntry) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onDeleteLegacyEntry?: (idx: number) => Promise<void>;
  saving: boolean;
}) {
  const item = data.featuredItem ?? defaultFeaturedItem;
  const [form, setForm] = useState<TransparencyFeaturedItem>({
    ...defaultFeaturedItem,
    ...item,
    abc: typeof item.abc === 'number' && !Number.isNaN(item.abc) ? item.abc : Math.floor(Number(item.abc)) || 0,
    requirements: Array.isArray(item.requirements) ? item.requirements : []
  });
  const [mission, setMission] = useState(data.mission ?? '');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<{ mission: string; featuredItem: TransparencyFeaturedItem } | null>(null);
  const [newRequirement, setNewRequirement] = useState('');
  const [newRequirementEdit, setNewRequirementEdit] = useState('');

  const update = (field: keyof TransparencyFeaturedItem, value: string | number | string[]) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const listItems: TransparencySealEntry[] =
    data.items && data.items.length > 0
      ? data.items
      : (data.mission != null || data.featuredItem != null ? [{ mission: data.mission, featuredItem: data.featuredItem }] : []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entry: TransparencySealEntry = { mission: mission.trim() || undefined, featuredItem: form };
    await onAddEntry(entry);
    setForm({
      projectTitle: '',
      referenceNo: '',
      abc: 0,
      closingDate: '',
      openingDate: '',
      location: '',
      description: '',
      requirements: [],
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      status: 'Active'
    });
    setMission('');
    setNewRequirement('');
  };

  const startInlineEdit = (entry: TransparencySealEntry, idx: number) => {
    const fi = entry.featuredItem ?? defaultFeaturedItem;
    setEditingIndex(idx);
    setEditingDraft({
      mission: entry.mission ?? '',
      featuredItem: {
        ...defaultFeaturedItem,
        ...fi,
        abc: typeof fi.abc === 'number' && !Number.isNaN(fi.abc) ? fi.abc : Math.floor(Number(fi.abc)) || 0,
        requirements: Array.isArray(fi.requirements) ? fi.requirements : []
      }
    });
  };

  const updateDraft = (field: keyof TransparencyFeaturedItem, value: string | number | string[]) => {
    if (!editingDraft) return;
    setEditingDraft((d) => (d ? { ...d, featuredItem: { ...d.featuredItem, [field]: value } } : null));
  };

  const saveInlineEdit = async () => {
    if (editingDraft == null || editingIndex == null) return;
    const entry: TransparencySealEntry = { mission: editingDraft.mission.trim() || undefined, featuredItem: editingDraft.featuredItem };
    const existing = listItems[editingIndex];
    if (existing?.id) {
      await onUpdateEntry(existing.id, entry);
    }
    setEditingIndex(null);
    setEditingDraft(null);
    setNewRequirementEdit('');
  };

  const cancelInlineEdit = () => {
    setEditingIndex(null);
    setEditingDraft(null);
    setNewRequirementEdit('');
  };

  const deleteEntry = async (idx: number) => {
    const entry = listItems[idx];
    if (entry?.id) {
      await onDeleteEntry(entry.id);
    } else if (onDeleteLegacyEntry) {
      await onDeleteLegacyEntry(idx);
    }
    if (editingIndex === idx) {
      setEditingIndex(null);
      setEditingDraft(null);
    } else if (editingIndex != null && editingIndex > idx) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg';
  const inputClassSm = 'w-full px-2 py-1.5 border border-gray-300 rounded text-sm';

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mission statement</label>
          <textarea
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            className={inputClass}
            rows={2}
            placeholder="Accountable and Transparent Governance..."
          />
        </div>
        <hr className="border-gray-200" />
        <p className="text-sm text-gray-600">Featured procurement item (same structure as Active Bidding mock data).</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
            <input type="text" value={form.projectTitle} onChange={(e) => update('projectTitle', e.target.value)} className={inputClass} placeholder="e.g. Supply and Delivery of Laboratory Equipment for Chemistry Department" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference No.</label>
            <input type="text" value={form.referenceNo} onChange={(e) => update('referenceNo', e.target.value)} className={inputClass} placeholder="e.g. WMSU-PR-2024-001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ABC (₱) — integer only</label>
            <div className="flex items-center border border-gray-300 rounded-lg bg-white">
              <span className="pl-3 py-2 text-gray-600">₱</span>
              <input type="number" min={0} step={1} value={form.abc === 0 ? '' : form.abc} onChange={(e) => { const v = e.target.value; const stripped = v === '' ? 0 : Math.floor(Number(String(v).replace(/^0+/, '') || '0')) || 0; update('abc', stripped); }} className="input-no-spinner w-full py-2 pr-3 border-0 rounded-r-lg" placeholder="2500000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closing Date</label>
            <input type="date" value={form.closingDate && /^\d{4}-\d{2}-\d{2}$/.test(form.closingDate) ? form.closingDate : ''} onChange={(e) => update('closingDate', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opening Date</label>
            <input type="date" value={form.openingDate && /^\d{4}-\d{2}-\d{2}$/.test(form.openingDate) ? form.openingDate : ''} onChange={(e) => update('openingDate', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status || 'Active'} onChange={(e) => update('status', e.target.value)} className={inputClass}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input type="text" value={form.location || ''} onChange={(e) => update('location', e.target.value)} className={inputClass} placeholder="e.g. WMSU Main Campus, Procurement Office" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
            <input type="text" value={form.contactPerson || ''} onChange={(e) => update('contactPerson', e.target.value)} className={inputClass} placeholder="e.g. Ms. Maria Santos" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
            <input type="email" value={form.contactEmail || ''} onChange={(e) => update('contactEmail', e.target.value)} className={inputClass} placeholder="procurement@wmsu.edu.ph" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone (starts with 09, max 11 digits)</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={11} value={form.contactPhone || ''} onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 11); const v = !d ? '' : d.startsWith('09') ? d : d.startsWith('9') ? ('09' + d.slice(1)).slice(0, 11) : ('09' + d).slice(0, 11); update('contactPhone', v); }} className={inputClass} placeholder="e.g. 09171234567" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Description</label>
            <textarea value={form.description || ''} onChange={(e) => update('description', e.target.value)} className={inputClass} rows={4} placeholder="Supply and delivery of various laboratory equipment..." />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
            <p className="text-xs text-gray-500 mb-2">Add each requirement as a separate item. You can list many requirements.</p>
            <ul className="space-y-1.5 mb-3 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
              {(Array.isArray(form.requirements) ? form.requirements : []).length === 0 ? (
                <li className="text-sm text-gray-400 py-2 px-2">No requirements yet. Add one below.</li>
              ) : (
                (Array.isArray(form.requirements) ? form.requirements : []).map((req, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded bg-white border border-gray-100 group">
                    <span className="text-sm text-gray-900 flex-1 min-w-0">{req}</span>
                    <button
                      type="button"
                      onClick={() => update('requirements', form.requirements.filter((_, j) => j !== i))}
                      className="shrink-0 p-1 text-gray-400 hover:text-red-600 rounded"
                      aria-label="Remove requirement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const v = newRequirement.trim();
                    if (v) {
                      update('requirements', [...(Array.isArray(form.requirements) ? form.requirements : []), v]);
                      setNewRequirement('');
                    }
                  }
                }}
                placeholder="e.g. Valid business permit"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => {
                  const v = newRequirement.trim();
                  if (v) {
                    update('requirements', [...(Array.isArray(form.requirements) ? form.requirements : []), v]);
                    setNewRequirement('');
                  }
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium text-sm shrink-0"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Add transparency seal
        </button>
      </form>

      {listItems.length > 0 && (
        <div className="border border-gray-200 rounded-xl bg-gray-50 p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">Saved data</h3>
          </div>
          {listItems.map((entry, idx) => (
            <div key={entry.id ?? idx} className="border border-gray-200 rounded-lg bg-white p-4 space-y-3">
              {editingIndex === idx && editingDraft ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Editing in place</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">Mission statement</label>
                    <textarea value={editingDraft.mission} onChange={(e) => setEditingDraft((d) => (d ? { ...d, mission: e.target.value } : null))} className={inputClassSm} rows={2} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-500 mb-0.5">Project Title</label><input type="text" value={editingDraft.featuredItem.projectTitle} onChange={(e) => updateDraft('projectTitle', e.target.value)} className={inputClassSm} /></div>
                    <div><label className="block text-xs font-medium text-gray-500 mb-0.5">Reference No.</label><input type="text" value={editingDraft.featuredItem.referenceNo} onChange={(e) => updateDraft('referenceNo', e.target.value)} className={inputClassSm} /></div>
                    <div><label className="block text-xs font-medium text-gray-500 mb-0.5">ABC (₱)</label><input type="number" min={0} value={editingDraft.featuredItem.abc || ''} onChange={(e) => { const v = e.target.value; const stripped = v === '' ? 0 : Math.floor(Number(String(v).replace(/^0+/, '') || '0')) || 0; updateDraft('abc', stripped); }} className={inputClassSm} /></div>
                    <div><label className="block text-xs font-medium text-gray-500 mb-0.5">Closing Date</label><input type="date" value={editingDraft.featuredItem.closingDate && /^\d{4}-\d{2}-\d{2}$/.test(editingDraft.featuredItem.closingDate) ? editingDraft.featuredItem.closingDate : ''} onChange={(e) => updateDraft('closingDate', e.target.value)} className={inputClassSm} /></div>
                    <div><label className="block text-xs font-medium text-gray-500 mb-0.5">Opening Date</label><input type="date" value={editingDraft.featuredItem.openingDate && /^\d{4}-\d{2}-\d{2}$/.test(editingDraft.featuredItem.openingDate) ? editingDraft.featuredItem.openingDate : ''} onChange={(e) => updateDraft('openingDate', e.target.value)} className={inputClassSm} /></div>
                    <div><label className="block text-xs font-medium text-gray-500 mb-0.5">Status</label><select value={editingDraft.featuredItem.status || 'Active'} onChange={(e) => updateDraft('status', e.target.value)} className={inputClassSm}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
                    <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-500 mb-0.5">Location</label><input type="text" value={editingDraft.featuredItem.location || ''} onChange={(e) => updateDraft('location', e.target.value)} className={inputClassSm} /></div>
                    <div><label className="block text-xs font-medium text-gray-500 mb-0.5">Contact Person</label><input type="text" value={editingDraft.featuredItem.contactPerson || ''} onChange={(e) => updateDraft('contactPerson', e.target.value)} className={inputClassSm} /></div>
                    <div><label className="block text-xs font-medium text-gray-500 mb-0.5">Contact Email</label><input type="email" value={editingDraft.featuredItem.contactEmail || ''} onChange={(e) => updateDraft('contactEmail', e.target.value)} className={inputClassSm} /></div>
                    <div><label className="block text-xs font-medium text-gray-500 mb-0.5">Contact Phone (09, 11 digits)</label><input type="text" inputMode="numeric" maxLength={11} value={editingDraft.featuredItem.contactPhone || ''} onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 11); const v = !d ? '' : d.startsWith('09') ? d : d.startsWith('9') ? ('09' + d.slice(1)).slice(0, 11) : ('09' + d).slice(0, 11); updateDraft('contactPhone', v); }} className={inputClassSm} /></div>
                    <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-500 mb-0.5">Project Description</label><textarea value={editingDraft.featuredItem.description || ''} onChange={(e) => updateDraft('description', e.target.value)} className={inputClassSm} rows={3} /></div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-0.5">Requirements</label>
                      <ul className="space-y-1 mb-2 max-h-32 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-1.5 text-sm">
                        {(Array.isArray(editingDraft.featuredItem.requirements) ? editingDraft.featuredItem.requirements : []).length === 0 ? (
                          <li className="text-gray-400 py-1 px-2">None</li>
                        ) : (
                          (Array.isArray(editingDraft.featuredItem.requirements) ? editingDraft.featuredItem.requirements : []).map((req, i) => (
                            <li key={i} className="flex items-center justify-between gap-1 py-1 px-2 rounded bg-white border border-gray-100">
                              <span className="min-w-0 flex-1 truncate">{req}</span>
                              <button type="button" onClick={() => updateDraft('requirements', editingDraft.featuredItem.requirements.filter((_: string, j: number) => j !== i))} className="shrink-0 p-0.5 text-gray-400 hover:text-red-600" aria-label="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                            </li>
                          ))
                        )}
                      </ul>
                      <div className="flex gap-1">
                        <input type="text" value={newRequirementEdit} onChange={(e) => setNewRequirementEdit(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = newRequirementEdit.trim(); if (v) { updateDraft('requirements', [...(editingDraft.featuredItem.requirements || []), v]); setNewRequirementEdit(''); } } }} placeholder="Add requirement" className={`${inputClassSm} flex-1`} />
                        <button type="button" onClick={() => { const v = newRequirementEdit.trim(); if (v) { updateDraft('requirements', [...(editingDraft.featuredItem.requirements || []), v]); setNewRequirementEdit(''); } }} className="px-2 py-1.5 bg-gray-200 rounded text-sm shrink-0">Add</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <button type="button" onClick={saveInlineEdit} disabled={saving} className="flex items-center gap-2 px-3 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 text-sm font-medium">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </button>
                    <button type="button" onClick={cancelInlineEdit} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => editingIndex != null && deleteEntry(editingIndex)}
                      disabled={saving}
                      className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-red-50 text-sm font-medium text-[#98111E] cursor-pointer disabled:opacity-50"
                      title="Delete this entry"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 border-b border-gray-100 pb-2">
                    {entry.mission && entry.featuredItem?.projectTitle
                      ? `Mission: ${String(entry.mission).slice(0, 50)}${String(entry.mission).length > 50 ? '…' : ''} · Featured: ${String(entry.featuredItem.projectTitle).slice(0, 40)}${String(entry.featuredItem.projectTitle).length > 40 ? '…' : ''}`
                      : entry.mission?.trim()
                        ? `Mission: ${String(entry.mission).slice(0, 80)}${String(entry.mission).length > 80 ? '…' : ''}`
                        : entry.featuredItem?.projectTitle
                          ? `Featured: ${String(entry.featuredItem.projectTitle).slice(0, 80)}${String(entry.featuredItem.projectTitle).length > 80 ? '…' : ''}`
                          : 'Transparency seal'}
                  </p>
                  {entry.mission?.trim() && <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Mission statement</p><p className="text-gray-900 text-sm">{entry.mission}</p></div>}
                  {entry.featuredItem?.projectTitle && (
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Featured procurement item</p>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div><dt className="text-gray-500">Project Title</dt><dd className="font-medium text-gray-900">{entry.featuredItem.projectTitle}</dd></div>
                        {entry.featuredItem.referenceNo && <div><dt className="text-gray-500">Reference No.</dt><dd className="text-gray-900">{entry.featuredItem.referenceNo}</dd></div>}
                        <div><dt className="text-gray-500">ABC (₱)</dt><dd className="text-gray-900">₱{Number(entry.featuredItem.abc).toLocaleString()}</dd></div>
                        {entry.featuredItem.closingDate && <div><dt className="text-gray-500">Closing Date</dt><dd className="text-gray-900">{entry.featuredItem.closingDate}</dd></div>}
                        {entry.featuredItem.openingDate && <div><dt className="text-gray-500">Opening Date</dt><dd className="text-gray-900">{entry.featuredItem.openingDate}</dd></div>}
                        {entry.featuredItem.status && <div><dt className="text-gray-500">Status</dt><dd className="text-gray-900">{entry.featuredItem.status}</dd></div>}
                        {entry.featuredItem.location && <div><dt className="text-gray-500">Location</dt><dd className="text-gray-900">{entry.featuredItem.location}</dd></div>}
                        {entry.featuredItem.contactPerson && <div><dt className="text-gray-500">Contact Person</dt><dd className="text-gray-900">{entry.featuredItem.contactPerson}</dd></div>}
                        {entry.featuredItem.contactEmail && <div><dt className="text-gray-500">Contact Email</dt><dd className="text-gray-900">{entry.featuredItem.contactEmail}</dd></div>}
                        {entry.featuredItem.contactPhone && <div><dt className="text-gray-500">Contact Phone</dt><dd className="text-gray-900">{entry.featuredItem.contactPhone}</dd></div>}
                      </dl>
                      {entry.featuredItem.description && <div><dt className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Project Description</dt><dd className="text-gray-900 text-sm">{entry.featuredItem.description}</dd></div>}
                      {Array.isArray(entry.featuredItem.requirements) && entry.featuredItem.requirements.length > 0 && <div><dt className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Requirements</dt><dd className="text-gray-900 text-sm"><ul className="list-disc list-inside space-y-0.5">{entry.featuredItem.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul></dd></div>}
                    </div>
                  )}
                  <div className="flex justify-end items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => startInlineEdit(entry, idx)}
                      disabled={!entry.id}
                      className="flex items-center gap-2 px-3 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 text-sm font-medium"
                      title={!entry.id ? 'Legacy entry: edit not available' : undefined}
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEntry(idx)}
                      disabled={saving || (!entry.id && !onDeleteLegacyEntry)}
                      className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-red-50 text-sm font-medium text-[#98111E] cursor-pointer disabled:opacity-50"
                      title="Delete this entry"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const MAX_BULLETIN_ATTACHMENTS = 5;

function BidBulletinsForm({
  onSaveSuccess,
  onDeleteSuccess,
  onError,
  saving,
  setSaving
}: {
  onSaveSuccess: () => void;
  onDeleteSuccess: () => void;
  onError: (msg: string) => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
}) {
  const [bulletins, setBulletins] = useState<(BidBulletin & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState('Bulletins');
  const [status, setStatus] = useState('Active');
  const [title, setTitle] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [date, setDate] = useState('');
  const [relatedTo, setRelatedTo] = useState('');
  const [description, setDescription] = useState('');
  const [changesText, setChangesText] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<BidBulletinAttachment[]>([]);

  const load = () => {
    bidBulletinsAPI.getAll().then(setBulletins).catch(() => setBulletins([])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setType('Bulletins');
    setStatus('Active');
    setTitle('');
    setReferenceNo('');
    setDate('');
    setRelatedTo('');
    setDescription('');
    setChangesText('');
    setAttachmentFiles([]);
    setExistingAttachments([]);
  };

  const startEdit = (b: BidBulletin & { id: string }) => {
    setEditingId(b.id);
    setType(b.type);
    setStatus(b.status);
    setTitle(b.title);
    setReferenceNo(b.referenceNo);
    setDate(b.date || '');
    setRelatedTo(b.relatedTo || '');
    setDescription(b.description || '');
    setChangesText((b.changes || []).join('\n'));
    setExistingAttachments(b.attachments || []);
    setAttachmentFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onError('');
    try {
      const changes = changesText.split('\n').map((s) => s.trim()).filter(Boolean);
      const bulletin: BidBulletin = {
        type,
        status,
        title,
        referenceNo,
        date,
        relatedTo: relatedTo.trim() || undefined,
        description: description.trim() || undefined,
        changes,
        attachments: [...existingAttachments]
      };

      let id: string;
      if (editingId) {
        id = editingId;
        const attachments: BidBulletinAttachment[] = [...existingAttachments];
        for (let i = 0; i < Math.min(attachmentFiles.length, MAX_BULLETIN_ATTACHMENTS - existingAttachments.length); i++) {
          const url = await bidBulletinsAPI.uploadAttachment(id, attachmentFiles[i]);
          attachments.push({ name: attachmentFiles[i].name, url });
        }
        bulletin.attachments = attachments.slice(0, MAX_BULLETIN_ATTACHMENTS);
        await bidBulletinsAPI.update(id, bulletin);
      } else {
        const created = await bidBulletinsAPI.create({ ...bulletin, attachments: [] });
        id = created.id;
        const attachments: BidBulletinAttachment[] = [];
        for (let i = 0; i < Math.min(attachmentFiles.length, MAX_BULLETIN_ATTACHMENTS); i++) {
          const url = await bidBulletinsAPI.uploadAttachment(id, attachmentFiles[i]);
          attachments.push({ name: attachmentFiles[i].name, url });
        }
        if (attachments.length > 0) await bidBulletinsAPI.update(id, { ...bulletin, attachments });
      }

      onSaveSuccess();
      resetForm();
      load();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    onError('');
    try {
      await bidBulletinsAPI.delete(id);
      onDeleteSuccess();
      if (editingId === id) resetForm();
      load();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg';
  const totalAttachmentSlots = existingAttachments.length + attachmentFiles.length;
  const canAddMoreFiles = totalAttachmentSlots < MAX_BULLETIN_ATTACHMENTS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Supplemental / Bid Bulletins</h2>
        <Link to="/bid-bulletins" className="text-sm text-red-900 font-medium hover:underline">View public page</Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
              <option value="Bulletins">Bulletins</option>
              <option value="Supplemental">Supplemental</option>
              <option value="Notice">Notice</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Bid Bulletin No. 1 - Supply and Delivery of Laboratory Equipment" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference No.</label>
            <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className={inputClass} placeholder="e.g. WMSU-BB-2024-001" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Related to</label>
          <input value={relatedTo} onChange={(e) => setRelatedTo(e.target.value)} className={inputClass} placeholder="e.g. WMSU-PR-2024-001" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} rows={3} placeholder="Brief description of the bulletin..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Changes &amp; Updates (one per line)</label>
          <textarea value={changesText} onChange={(e) => setChangesText(e.target.value)} className={inputClass} rows={4} placeholder="Extension of submission deadline...&#10;Clarification on technical specifications..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Attachments (max {MAX_BULLETIN_ATTACHMENTS})</label>
          {existingAttachments.length > 0 && (
            <ul className="mb-2 text-sm text-gray-600">
              {existingAttachments.map((a, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span>{a.name}</span>
                  <button type="button" onClick={() => setExistingAttachments((prev) => prev.filter((_, j) => j !== i))} className="text-[#98111E] hover:underline text-xs">Remove</button>
                </li>
              ))}
            </ul>
          )}
          {canAddMoreFiles && (
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const added = files.slice(0, MAX_BULLETIN_ATTACHMENTS - totalAttachmentSlots);
                setAttachmentFiles((prev) => [...prev, ...added].slice(0, MAX_BULLETIN_ATTACHMENTS - existingAttachments.length));
                e.target.value = '';
              }}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-red-50 file:text-red-900 file:cursor-pointer file:hover:bg-red-100 file:transition-colors"
            />
          )}
          <p className="mt-1 text-xs text-gray-500">{totalAttachmentSlots} / {MAX_BULLETIN_ATTACHMENTS} attachments</p>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editingId ? 'Update bulletin' : 'Add bulletin'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading bulletins…</p>
      ) : bulletins.length > 0 ? (
        <div className="border border-gray-200 rounded-xl bg-gray-50 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Saved bulletins</h3>
          {bulletins.map((b) => (
            <div key={b.id} className="border border-gray-200 rounded-lg bg-white p-4 flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">{b.title}</p>
                <p className="text-sm text-gray-600">#{b.referenceNo} · {b.type} · {b.status}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => startEdit(b)} className="flex items-center gap-2 px-3 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 text-sm font-medium">
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button type="button" onClick={() => handleDelete(b.id)} disabled={saving} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-red-50 text-[#98111E] text-sm font-medium cursor-pointer disabled:opacity-50">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
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
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const addItem = () => {
    setItems((i) => [...i, { title: '', description: '', url: '', category: 'pbd' }]);
  };
  const removeItem = (idx: number) => {
    setItems((i) => i.filter((_, j) => j !== idx));
  };
  const updateItem = (idx: number, field: keyof LandingDocumentItem, value: string) => {
    setItems((i) => i.map((item, j) => (j === idx ? { ...item, [field]: value } : item)));
  };

  const uploadFile = async (idx: number, file: File): Promise<string | null> => {
    setUploadError(null);
    setUploadingIdx(idx);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `documents/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from('procurement-documents')
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('procurement-documents').getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
      return null;
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleFileChange = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(idx, file);
    if (url) updateItem(idx, 'url', url);
    e.target.value = '';
  };

  const clearFile = (idx: number) => {
    updateItem(idx, 'url', '');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Attach files for Procurement Documents. Upload PDFs or other files; they will be available for download on the landing page.</p>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-900 font-medium cursor-pointer hover:bg-red-50 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add document
        </button>
      </div>
      {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
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
            <button type="button" onClick={() => removeItem(i)} className="p-1 text-[#98111E]">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <input
            value={item.description}
            onChange={(e) => updateItem(i, 'description', e.target.value)}
            placeholder="Short description"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              id={`doc-file-${i}`}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
              onChange={(e) => handleFileChange(i, e)}
              disabled={uploadingIdx !== null}
            />
            <label
              htmlFor={`doc-file-${i}`}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50"
            >
              {uploadingIdx === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {uploadingIdx === i ? 'Uploading…' : item.url ? 'Replace file' : 'Attach file'}
            </label>
            {item.url && (
              <>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 underline hover:text-gray-900">
                  View current file
                </a>
                <button type="button" onClick={() => clearFile(i)} className="text-sm text-gray-500 hover:text-red-600">
                  Remove file
                </button>
              </>
            )}
          </div>
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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function PlanningCards({
  data,
  onSave,
  saving
}: {
  data: LandingPlanning;
  onSave: (d: LandingPlanning) => void;
  saving: boolean;
}) {
  const appItems = data.appItems ?? [];
  const [expandedCard, setExpandedCard] = useState<'app' | 'bidwinners' | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [month, setMonth] = useState<number>(0);

  // Bid Winners (admin) state
  const [bidWinners, setBidWinners] = useState<BidWinnerWithSupplier[]>([]);
  const [bidWinnersLoading, setBidWinnersLoading] = useState(false);
  const [bidWinnersSaving, setBidWinnersSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [bwForm, setBwForm] = useState({
    project_title: '',
    reference_no: '',
    winner_supplier_id: '',
    winner_name: '',
    contract_amount: '',
    date_awarded: '',
    notes: ''
  });

  useEffect(() => {
    if (expandedCard === 'bidwinners') {
      setBidWinnersLoading(true);
      Promise.all([bidWinnersAPI.getAll(), suppliersAPI.getAll()])
        .then(([winners, suppList]) => {
          setBidWinners(winners);
          setSuppliers(suppList.map((s) => ({ id: s.id, name: s.name })));
        })
        .catch(() => setBidWinners([]))
        .finally(() => setBidWinnersLoading(false));
    }
  }, [expandedCard]);

  const handleAddBidWinner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bwForm.project_title.trim()) return;
    const amount = parseFloat(bwForm.contract_amount) || 0;
    setBidWinnersSaving(true);
    try {
      await bidWinnersAPI.create({
        project_title: bwForm.project_title.trim(),
        reference_no: bwForm.reference_no.trim() || null,
        winner_supplier_id: bwForm.winner_supplier_id || null,
        winner_name: bwForm.winner_name.trim() || null,
        contract_amount: amount,
        date_awarded: bwForm.date_awarded.trim() || null,
        notes: bwForm.notes.trim() || null
      });
      setBwForm({ project_title: '', reference_no: '', winner_supplier_id: '', winner_name: '', contract_amount: '', date_awarded: '', notes: '' });
      const list = await bidWinnersAPI.getAll();
      setBidWinners(list);
    } catch (err) {
      console.error(err);
    } finally {
      setBidWinnersSaving(false);
    }
  };

  const handleRemoveBidWinner = async (id: string) => {
    try {
      await bidWinnersAPI.delete(id);
      setBidWinners((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAppItem = (e: React.FormEvent) => {
    e.preventDefault();
    const numBudget = Math.floor(Number(budget)) || 0;
    if (!projectTitle.trim()) return;
    const next: LandingPlanning = {
      ...data,
      appItems: [...appItems, { projectTitle: projectTitle.trim(), description: description.trim(), budget: numBudget, month }]
    };
    onSave(next);
    setProjectTitle('');
    setDescription('');
    setBudget('');
    setMonth(0);
  };

  const handleRemoveAppItem = (index: number) => {
    const next = appItems.filter((_, i) => i !== index);
    onSave({ ...data, appItems: next });
  };

  const appCardContent = (
    <>
      <h3 className="font-semibold text-gray-900 mb-4">APP (Annual Procurement Plan)</h3>
      <form onSubmit={handleAddAppItem} className="space-y-3">
        <input
          type="text"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          placeholder="Project title"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <input
          type="number"
          min={0}
          step={1}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="Budget (integer)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          {MONTHS.map((name, i) => (
            <option key={i} value={i}>{name}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 text-sm font-medium"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add item
        </button>
      </form>
      {appItems.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-gray-200 pt-4">
          {appItems.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm">{item.projectTitle}</p>
                {item.description && <p className="text-xs text-gray-600 mt-0.5">{item.description}</p>}
                <p className="text-xs text-gray-500 mt-1">₱{item.budget.toLocaleString()} · {MONTHS[item.month]}</p>
              </div>
              <button type="button" onClick={() => handleRemoveAppItem(i)} className="text-[#98111E] hover:text-[#98111E] p-1 cursor-pointer" aria-label="Remove">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const winnerDisplay = (row: BidWinnerWithSupplier) =>
    (row.winner_supplier as { name?: string } | null)?.name ?? row.winner_name ?? '—';

  if (expandedCard === 'app') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setExpandedCard(null)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Planning & Reporting
        </button>
        <div className="rounded-xl border-2 border-gray-200 bg-white p-6 w-full">
          {appCardContent}
        </div>
      </div>
    );
  }

  if (expandedCard === 'bidwinners') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setExpandedCard(null)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Planning & Reporting
        </button>
        <div className="rounded-xl border-2 border-gray-200 bg-white p-6 w-full">
          <h3 className="font-semibold text-gray-900 mb-4">Bid Winners & Awardees</h3>
          <form onSubmit={handleAddBidWinner} className="space-y-3">
            <input
              type="text"
              value={bwForm.project_title}
              onChange={(e) => setBwForm((f) => ({ ...f, project_title: e.target.value }))}
              placeholder="Project title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <input
              type="text"
              value={bwForm.reference_no}
              onChange={(e) => setBwForm((f) => ({ ...f, reference_no: e.target.value }))}
              placeholder="Reference no."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={bwForm.winner_supplier_id}
                onChange={(e) => setBwForm((f) => ({ ...f, winner_supplier_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Winner (supplier)</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={bwForm.winner_name}
                onChange={(e) => setBwForm((f) => ({ ...f, winner_name: e.target.value }))}
                placeholder="Or winner name (if not in list)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="number"
                min={0}
                step={0.01}
                value={bwForm.contract_amount}
                onChange={(e) => setBwForm((f) => ({ ...f, contract_amount: e.target.value }))}
                placeholder="Contract amount (₱)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
              <input
                type="date"
                value={bwForm.date_awarded}
                onChange={(e) => setBwForm((f) => ({ ...f, date_awarded: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <input
              type="text"
              value={bwForm.notes}
              onChange={(e) => setBwForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              type="submit"
              disabled={bidWinnersSaving}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 text-sm font-medium"
            >
              {bidWinnersSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add item
            </button>
          </form>
          {bidWinnersLoading ? (
            <div className="flex items-center gap-2 text-gray-500 py-6 justify-center mt-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading…</span>
            </div>
          ) : bidWinners.length > 0 ? (
            <ul className="mt-4 space-y-2 border-t border-gray-200 pt-4">
              {bidWinners.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{row.project_title}</p>
                    {(row.reference_no || row.notes) && (
                      <p className="text-xs text-gray-600 mt-0.5">{[row.reference_no, row.notes].filter(Boolean).join(' · ')}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      ₱{Number(row.contract_amount).toLocaleString()} · {winnerDisplay(row)}
                      {row.date_awarded && ` · ${new Date(row.date_awarded).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBidWinner(row.id)}
                    className="text-[#98111E] hover:text-[#98111E] p-1 cursor-pointer"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <button
        type="button"
        onClick={() => setExpandedCard('app')}
        className="flex flex-col items-center justify-center min-h-[140px] p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-red-900 hover:shadow-md transition-all cursor-pointer text-left w-full"
      >
        <span className="font-semibold text-gray-900">APP (Annual Procurement Plan)</span>
        <span className="text-sm text-gray-500 mt-2">Click to open</span>
      </button>
      <button
        type="button"
        onClick={() => setExpandedCard('bidwinners')}
        className="flex flex-col items-center justify-center min-h-[140px] p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-red-900 hover:shadow-md transition-all cursor-pointer text-left w-full"
      >
        <span className="font-semibold text-gray-900">Bid Winners & Awardees</span>
        <span className="text-sm text-gray-500 mt-2">PMR — Manage winners (view on landing)</span>
      </button>
    </div>
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
