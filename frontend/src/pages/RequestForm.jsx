import React, { useState, useEffect } from 'react';
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

const EXECUTIVE_THRESHOLD = 50000;

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
    justification: '',
    business_case: '',
    vendor: '',
    expected_roi: '',
    priority: 'medium',
  });
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
            justification: r.justification || '',
            business_case: r.business_case || '',
            vendor: r.vendor || '',
            expected_roi: r.expected_roi || '',
            priority: r.priority || 'medium',
          });
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
      let request;
      if (isEdit) {
        request = await api.updateRequest(id, form);
      } else {
        request = await api.createRequest(form);
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
  const needsExecutive = amount >= EXECUTIVE_THRESHOLD;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit CAPEX Request' : 'New CAPEX Request'}
        </h1>
        <p className="text-gray-500 mt-1">
          Submit a capital expenditure request for approval. Fields marked * are required.
        </p>
      </div>

      {errors._global && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {errors._global}
        </div>
      )}

      {/* Approval path notice */}
      {amount > 0 && (
        <div className={`mb-6 p-4 rounded-lg border text-sm ${needsExecutive ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'}`}>
          <p className={`font-medium mb-1 ${needsExecutive ? 'text-purple-800' : 'text-blue-800'}`}>
            {needsExecutive ? '🏆 Executive Approval Required' : '✅ Standard Approval Path'}
          </p>
          <p className={needsExecutive ? 'text-purple-700' : 'text-blue-700'}>
            {needsExecutive
              ? `Requests ≥ $50,000 require Manager → Finance → Executive approval.`
              : `This request will go through Manager → Finance approval.`}
          </p>
        </div>
      )}

      <div className="card space-y-6">
        {/* Basic info */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Request Details</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">Title *</label>
              <input value={form.title} onChange={set('title')} className="form-input"
                placeholder="e.g., MacBook Pro laptops for engineering team" />
              {errors.title && <p className="form-error">{errors.title}</p>}
            </div>

            <div>
              <label className="form-label">Description *</label>
              <textarea value={form.description} onChange={set('description')} rows={3}
                className="form-textarea" placeholder="Describe what you need and why..." />
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
                  <option value="">Select category...</option>
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

        {/* Justification */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Business Justification</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">Justification *</label>
              <textarea value={form.justification} onChange={set('justification')} rows={4}
                className="form-textarea"
                placeholder="Explain the business need for this expenditure. Include impact if not approved..." />
              {errors.justification && <p className="form-error">{errors.justification}</p>}
            </div>

            <div>
              <label className="form-label">Business Case / Benefits</label>
              <textarea value={form.business_case} onChange={set('business_case')} rows={3}
                className="form-textarea"
                placeholder="Describe the expected benefits, productivity gains, or cost savings..." />
            </div>

            <div>
              <label className="form-label">Expected ROI / Payback Period</label>
              <input value={form.expected_roi} onChange={set('expected_roi')} className="form-input"
                placeholder="e.g., 18-month payback through 20% productivity improvement" />
            </div>
          </div>
        </section>

        {/* Vendor */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Vendor Information</h2>
          <div>
            <label className="form-label">Preferred Vendor / Supplier</label>
            <input value={form.vendor} onChange={set('vendor')} className="form-input"
              placeholder="e.g., Apple Inc., Dell Technologies, AWS" />
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
            onClick={() => handleSave(false)}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            {loading && !submitDraft ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={loading}
            className="btn-primary flex-1 py-2.5"
          >
            {loading && submitDraft ? 'Submitting...' : 'Submit for Approval →'}
          </button>
        </div>
      </div>
    </div>
  );
}
