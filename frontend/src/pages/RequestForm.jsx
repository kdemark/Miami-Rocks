import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES = [
  'IT Equipment',
  'Software/Licenses',
  'Office Equipment',
  'Vehicles',
  'Machinery',
  'Infrastructure',
  'Other',
];

const PRIORITIES = [
  { value: 'low', label: 'Low', desc: 'No immediate urgency' },
  { value: 'medium', label: 'Medium', desc: 'Standard timeline' },
  { value: 'high', label: 'High', desc: 'Required within 30 days' },
  { value: 'critical', label: 'Critical', desc: 'Urgent — business impact' },
];

const MANAGER_THRESHOLD = 2500;
const EXECUTIVE_THRESHOLD = 50000;

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

// Resize an image file to a data URL (max 1200px, JPEG 0.80 quality)
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.8), name: file.name });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Similar Requests Panel ──────────────────────────────────────────────────
function SimilarRequestsPanel({ category }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!category) { setItems([]); return; }
    setLoading(true);
    api.getSimilarRequests(category)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [category]);

  if (!category) return null;
  if (!loading && items.length === 0) return null;

  return (
    <div className="mb-6 border border-blue-200 rounded-xl bg-blue-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-blue-600 text-lg">📚</span>
          <span className="font-semibold text-blue-800 text-sm">
            Similar Approved Requests — {category}
          </span>
          {!loading && (
            <span className="text-xs bg-blue-200 text-blue-700 font-medium px-1.5 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        <span className="text-blue-500 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-4">
          <p className="text-xs text-blue-600 mb-3">
            Use these approved requests as formatting and content examples for your own submission.
          </p>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(r => (
                <div key={r.id} className="bg-white rounded-lg border border-blue-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{r.title}</p>
                      <p className="text-xs text-gray-500">{r.department} · {formatCurrency(r.amount)}</p>
                    </div>
                    <span className="text-gray-400 text-xs ml-3 flex-shrink-0">
                      {expanded === r.id ? '▲ Hide' : '▼ View'}
                    </span>
                  </button>
                  {expanded === r.id && (
                    <div className="px-4 pb-4 border-t border-gray-100 space-y-3">
                      {r.problem && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Problem</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.problem}</p>
                        </div>
                      )}
                      {r.solution && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Solution</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.solution}</p>
                        </div>
                      )}
                      {r.justification && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Justification</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.justification}</p>
                        </div>
                      )}
                      {r.bids && r.bids.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Bids ({r.bids.length})
                          </p>
                          <div className="space-y-1">
                            {r.bids.map((b, i) => (
                              <p key={i} className="text-sm text-gray-700">
                                <span className="font-medium">{b.vendor}</span> — {formatCurrency(b.amount)}
                                {b.notes && <span className="text-gray-500"> · {b.notes}</span>}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Bids Section ────────────────────────────────────────────────────────────
function BidsSection({ bids, onChange }) {
  const addBid = () => onChange([...bids, { vendor: '', amount: '', notes: '' }]);
  const removeBid = (i) => onChange(bids.filter((_, idx) => idx !== i));
  const updateBid = (i, field, value) => {
    const next = bids.map((b, idx) => idx === i ? { ...b, [field]: value } : b);
    onChange(next);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Competitive Bids / Quotes</h2>
          <p className="text-xs text-gray-500 mt-0.5">Add vendor bids or price quotes obtained for this request</p>
        </div>
        <button
          type="button"
          onClick={addBid}
          className="btn-secondary text-xs py-1.5 px-3"
        >
          + Add Bid
        </button>
      </div>

      {bids.length === 0 ? (
        <button
          type="button"
          onClick={addBid}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg py-6 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          Click to add vendor bids or price quotes
        </button>
      ) : (
        <div className="space-y-3">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 px-1">
            <p className="col-span-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor / Supplier</p>
            <p className="col-span-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</p>
            <p className="col-span-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</p>
            <p className="col-span-1" />
          </div>
          {bids.map((bid, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="col-span-5">
                <input
                  value={bid.vendor}
                  onChange={e => updateBid(i, 'vendor', e.target.value)}
                  className="form-input text-sm"
                  placeholder="e.g., Dell Technologies"
                />
              </div>
              <div className="col-span-3">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={bid.amount}
                    onChange={e => updateBid(i, 'amount', e.target.value)}
                    className="form-input pl-7 text-sm"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="col-span-3">
                <input
                  value={bid.notes}
                  onChange={e => updateBid(i, 'notes', e.target.value)}
                  className="form-input text-sm"
                  placeholder="Lead time, warranty…"
                />
              </div>
              <div className="col-span-1 flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => removeBid(i)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                  title="Remove bid"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addBid}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add another bid
          </button>
        </div>
      )}
    </section>
  );
}

// ── Photos Section ──────────────────────────────────────────────────────────
function PhotosSection({ photos, onChange }) {
  const fileInputRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(async (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!valid.length) return;
    if (photos.length + valid.length > 10) {
      alert('Maximum 10 photos allowed per request');
      return;
    }
    setUploading(true);
    try {
      const resized = await Promise.all(valid.map(resizeImage));
      onChange([...photos, ...resized]);
    } finally {
      setUploading(false);
    }
  }, [photos, onChange]);

  const removePhoto = (i) => onChange(photos.filter((_, idx) => idx !== i));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <section>
      <div className="mb-4 pb-2 border-b">
        <h2 className="text-base font-semibold text-gray-900">Supporting Photos</h2>
        <p className="text-xs text-gray-500 mt-0.5">Attach photos of the issue, existing equipment, or site conditions (max 10)</p>
      </div>

      {/* Dropzone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            <p className="text-sm text-gray-500">Processing images…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl">📷</span>
            <p className="text-sm font-medium text-gray-700">
              {dragging ? 'Drop photos here' : 'Click or drag photos here'}
            </p>
            <p className="text-xs text-gray-400">JPG, PNG, GIF — images will be resized automatically</p>
          </div>
        )}
      </div>

      {/* Photo thumbnails */}
      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
              <img
                src={photo.dataUrl}
                alt={photo.name || `Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-start justify-end p-1.5 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                  className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow hover:bg-red-600"
                  title="Remove photo"
                >
                  ✕
                </button>
              </div>
              <p className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs truncate px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.name || `Photo ${i + 1}`}
              </p>
            </div>
          ))}
        </div>
      )}
      {photos.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">{photos.length} / 10 photos added</p>
      )}
    </section>
  );
}

// ── Main Form Component ─────────────────────────────────────────────────────
export default function RequestForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    title: '',
    description: '',
    amount: '',
    category: '',
    priority: 'medium',
    problem: '',
    solution: '',
    justification: '',
    business_case: '',
    vendor: '',
    expected_roi: '',
  });
  const [photos, setPhotos] = useState([]);
  const [bids, setBids] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitDraft, setSubmitDraft] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      api.getRequest(id)
        .then(r => {
          setForm({
            title: r.title || '',
            description: r.description || '',
            amount: r.amount || '',
            category: r.category || '',
            priority: r.priority || 'medium',
            problem: r.problem || '',
            solution: r.solution || '',
            justification: r.justification || '',
            business_case: r.business_case || '',
            vendor: r.vendor || '',
            expected_roi: r.expected_roi || '',
          });
          setPhotos(Array.isArray(r.photos) ? r.photos : []);
          setBids(Array.isArray(r.bids) ? r.bids : []);
        })
        .catch(() => navigate('/requests'))
        .finally(() => setFetchLoading(false));
    }
  }, [id, isEdit, navigate]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      errs.amount = 'Valid amount is required';
    }
    if (!form.category) errs.category = 'Category is required';
    if (!form.problem.trim()) errs.problem = 'Problem statement is required';
    if (!form.solution.trim()) errs.solution = 'Proposed solution is required';
    if (!form.justification.trim()) errs.justification = 'Business justification is required';
    return errs;
  };

  const handleSave = async (andSubmit) => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    setSubmitDraft(andSubmit);
    try {
      const payload = { ...form, photos, bids };
      let request;
      if (isEdit) {
        request = await api.updateRequest(id, payload);
      } else {
        request = await api.createRequest(payload);
      }
      if (andSubmit) {
        await api.submitRequest(request.id);
      }
      navigate(`/requests/${request.id}`);
    } catch (err) {
      setErrors({ _global: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  const amount = Number(form.amount);

  // Approval path indicator
  const approvalPath = (() => {
    if (!amount || amount <= 0) return null;
    if (amount < MANAGER_THRESHOLD) return {
      color: 'green',
      icon: '✅',
      label: 'Manager Approval Only',
      detail: `Requests under ${formatCurrency(MANAGER_THRESHOLD)} require only manager approval.`,
    };
    if (amount < EXECUTIVE_THRESHOLD) return {
      color: 'blue',
      icon: '📋',
      label: 'Standard Approval Path',
      detail: `Requests from ${formatCurrency(MANAGER_THRESHOLD)} require Manager → Finance approval.`,
    };
    return {
      color: 'purple',
      icon: '🏆',
      label: 'Executive Approval Required',
      detail: `Requests ${formatCurrency(EXECUTIVE_THRESHOLD)}+ require Manager → Finance → Executive approval.`,
    };
  })();

  const colorMap = {
    green: { bg: 'bg-green-50', border: 'border-green-200', title: 'text-green-800', body: 'text-green-700' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', title: 'text-blue-800', body: 'text-blue-700' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', title: 'text-purple-800', body: 'text-purple-700' },
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit CAPEX Request' : 'New CAPEX Request'}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Submit a capital expenditure request for approval. Fields marked * are required.
        </p>
      </div>

      {/* Global error */}
      {errors._global && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {errors._global}
        </div>
      )}

      {/* Similar approved requests panel */}
      <SimilarRequestsPanel category={form.category} />

      {/* Approval path badge */}
      {approvalPath && (
        <div className={`mb-6 p-4 rounded-lg border text-sm ${colorMap[approvalPath.color].bg} ${colorMap[approvalPath.color].border}`}>
          <p className={`font-semibold mb-0.5 ${colorMap[approvalPath.color].title}`}>
            {approvalPath.icon} {approvalPath.label}
          </p>
          <p className={colorMap[approvalPath.color].body}>{approvalPath.detail}</p>
        </div>
      )}

      <div className="card space-y-8">

        {/* ── Section 1: Request Overview ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Request Overview</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">Title *</label>
              <input value={form.title} onChange={set('title')} className="form-input"
                placeholder="e.g., Replace aging server infrastructure in data center" />
              {errors.title && <p className="form-error">{errors.title}</p>}
            </div>

            <div>
              <label className="form-label">Description *</label>
              <textarea value={form.description} onChange={set('description')} rows={3}
                className="form-textarea" placeholder="High-level summary of what is being requested…" />
              {errors.description && <p className="form-error">{errors.description}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Amount (USD) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                  <input type="number" value={form.amount} onChange={set('amount')}
                    className="form-input pl-7" placeholder="0.00" min="0" step="0.01" />
                </div>
                {errors.amount && <p className="form-error">{errors.amount}</p>}
              </div>
              <div>
                <label className="form-label">Category *</label>
                <select value={form.category} onChange={set('category')} className="form-select">
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="form-error">{errors.category}</p>}
              </div>
            </div>

            <div>
              <label className="form-label">Priority</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                {PRIORITIES.map(p => (
                  <label key={p.value} className={`cursor-pointer p-3 rounded-lg border-2 transition-colors ${
                    form.priority === p.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="priority" value={p.value}
                      checked={form.priority === p.value} onChange={set('priority')} className="sr-only" />
                    <p className="text-sm font-medium text-gray-900">{p.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 2: Problem Statement ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-1 pb-2 border-b">Problem Statement</h2>
          <p className="text-xs text-gray-500 mb-4">Describe the current problem, pain point, or gap that this request addresses.</p>
          <div>
            <label className="form-label">Problem *</label>
            <textarea value={form.problem} onChange={set('problem')} rows={4}
              className="form-textarea"
              placeholder="e.g., The current servers are 7 years old, operating at 95% capacity, and experiencing weekly failures causing 2–3 hours of unplanned downtime per month. This impacts all production systems and costs approximately $8,000/month in lost productivity." />
            {errors.problem && <p className="form-error">{errors.problem}</p>}
          </div>
        </section>

        {/* ── Section 3: Proposed Solution ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-1 pb-2 border-b">Proposed Solution</h2>
          <p className="text-xs text-gray-500 mb-4">Describe the specific solution you are proposing and why it is the right approach.</p>
          <div>
            <label className="form-label">Solution *</label>
            <textarea value={form.solution} onChange={set('solution')} rows={4}
              className="form-textarea"
              placeholder="e.g., Replace the three existing Dell PowerEdge R620 servers with two new Dell PowerEdge R750s. The new servers will provide 300% more compute capacity, modern NVMe storage, and 5-year warranty with on-site support." />
            {errors.solution && <p className="form-error">{errors.solution}</p>}
          </div>
        </section>

        {/* ── Section 4: Business Justification ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Business Justification</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">Justification *</label>
              <textarea value={form.justification} onChange={set('justification')} rows={4}
                className="form-textarea"
                placeholder="Explain the business impact, consequences of not approving, and strategic alignment…" />
              {errors.justification && <p className="form-error">{errors.justification}</p>}
            </div>
            <div>
              <label className="form-label">Business Case / Expected Benefits</label>
              <textarea value={form.business_case} onChange={set('business_case')} rows={3}
                className="form-textarea"
                placeholder="Describe productivity gains, cost savings, risk reduction, or compliance requirements…" />
            </div>
            <div>
              <label className="form-label">Expected ROI / Payback Period</label>
              <input value={form.expected_roi} onChange={set('expected_roi')} className="form-input"
                placeholder="e.g., 18-month payback; eliminates $96K/year in downtime costs" />
            </div>
          </div>
        </section>

        {/* ── Section 5: Competitive Bids ── */}
        <BidsSection bids={bids} onChange={setBids} />

        {/* ── Section 6: Supporting Photos ── */}
        <PhotosSection photos={photos} onChange={setPhotos} />

        {/* ── Section 7: Vendor Information ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Preferred Vendor</h2>
          <div>
            <label className="form-label">Preferred Vendor / Supplier</label>
            <input value={form.vendor} onChange={set('vendor')} className="form-input"
              placeholder="e.g., Dell Technologies, Apple Inc., AWS" />
          </div>
        </section>

        {/* Submitter info */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p><span className="font-medium">Submitter:</span> {user?.name} ({user?.email})</p>
          <p><span className="font-medium">Department:</span> {user?.department}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            {loading && !submitDraft ? 'Saving…' : 'Save as Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={loading}
            className="btn-primary flex-1 py-2.5"
          >
            {loading && submitDraft ? 'Submitting…' : 'Submit for Approval →'}
          </button>
        </div>
      </div>
    </div>
  );
}
