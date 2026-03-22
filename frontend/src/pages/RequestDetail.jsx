import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { ApprovalTimeline } from '../components/ApprovalTimeline';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d) {
  return new Date(d).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function Section({ title, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      <h2 className="font-semibold text-gray-900 mb-4 pb-2 border-b">{title}</h2>
      {children}
    </div>
  );
}

// ── Photos Gallery ──────────────────────────────────────────────────────────
function PhotosGallery({ photos }) {
  const [lightbox, setLightbox] = useState(null);
  if (!photos || photos.length === 0) return null;

  return (
    <>
      <Section title={`Supporting Photos (${photos.length})`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, i) => (
            <button
              key={i}
              onClick={() => setLightbox(i)}
              className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <img
                src={photo.dataUrl}
                alt={photo.name || `Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </Section>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <img
              src={photos[lightbox].dataUrl}
              alt={photos[lightbox].name || `Photo ${lightbox + 1}`}
              className="max-h-[85vh] max-w-full rounded-lg shadow-2xl object-contain"
            />
            <p className="text-white text-sm text-center mt-2 opacity-75">
              {photos[lightbox].name || `Photo ${lightbox + 1}`} — {lightbox + 1} / {photos.length}
            </p>
            {/* Prev / Next */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setLightbox((lightbox - 1 + photos.length) % photos.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70"
                >
                  ‹
                </button>
                <button
                  onClick={() => setLightbox((lightbox + 1) % photos.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70"
                >
                  ›
                </button>
              </>
            )}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Bids Table ──────────────────────────────────────────────────────────────
function BidsTable({ bids }) {
  if (!bids || bids.length === 0) return null;

  const lowestIdx = bids.reduce((low, b, i) => {
    const a = Number(b.amount);
    return a > 0 && a < Number(bids[low]?.amount || Infinity) ? i : low;
  }, -1);

  return (
    <Section title={`Competitive Bids / Quotes (${bids.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-2 pr-4">Vendor / Supplier</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide pb-2 pr-4">Amount</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bids.map((bid, i) => (
              <tr key={i} className={i === lowestIdx ? 'bg-green-50' : ''}>
                <td className="py-3 pr-4 font-medium text-gray-900">
                  {bid.vendor || '—'}
                  {i === lowestIdx && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                      Lowest
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-right font-semibold text-gray-900">
                  {bid.amount ? formatCurrency(Number(bid.amount)) : '—'}
                </td>
                <td className="py-3 text-gray-500">{bid.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.getRequest(id)
      .then(setRequest)
      .catch(() => navigate('/requests'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const canApprove = () => {
    if (!request) return false;
    return (
      (request.status === 'pending_manager' && (user.role === 'manager' || user.role === 'admin')) ||
      (request.status === 'pending_finance' && (user.role === 'finance' || user.role === 'admin')) ||
      (request.status === 'pending_executive' && (user.role === 'executive' || user.role === 'admin'))
    );
  };

  const canReject = canApprove;

  const canCancel = () => {
    if (!request) return false;
    return (request.requester_id === user.id || user.role === 'admin') &&
      ['draft', 'pending_manager'].includes(request.status);
  };

  const canEdit = () => {
    if (!request) return false;
    return request.status === 'draft' && (request.requester_id === user.id || user.role === 'admin');
  };

  const canSubmit = () => {
    if (!request) return false;
    return request.status === 'draft' && (request.requester_id === user.id || user.role === 'admin');
  };

  const handleApprove = async () => {
    setActionLoading(true);
    setError('');
    try {
      await api.approveRequest(id, comments);
      setShowApproveModal(false);
      setComments('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) { setError('Rejection reason is required'); return; }
    setActionLoading(true);
    setError('');
    try {
      await api.rejectRequest(id, comments);
      setShowRejectModal(false);
      setComments('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      await api.submitRequest(id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    setActionLoading(true);
    try {
      await api.cancelRequest(id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!request) return null;

  const stepLabel = {
    pending_manager: 'Awaiting Manager Approval',
    pending_finance: 'Awaiting Finance Review',
    pending_executive: 'Awaiting Executive Approval',
    approved: 'Request Approved',
    rejected: 'Request Rejected',
    draft: 'Draft — Not yet submitted',
    cancelled: 'Request Cancelled',
  }[request.status];

  const photos = Array.isArray(request.photos) ? request.photos : [];
  const bids = Array.isArray(request.bids) ? request.bids : [];

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        ← Back
      </button>

      {/* Header card */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{request.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{stepLabel}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(request.amount)}</p>
            <p className="text-sm text-gray-500 mt-1">{request.category}</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Action buttons */}
        {(canApprove() || canReject() || canCancel() || canEdit() || canSubmit()) && (
          <div className="mt-6 pt-4 border-t flex flex-wrap gap-3">
            {canEdit() && (
              <Link to={`/requests/${id}/edit`} className="btn-secondary">Edit Request</Link>
            )}
            {canSubmit() && (
              <button onClick={handleSubmit} disabled={actionLoading} className="btn-primary">
                {actionLoading ? 'Submitting…' : 'Submit for Approval'}
              </button>
            )}
            {canApprove() && (
              <button onClick={() => { setComments(''); setShowApproveModal(true); }} className="btn-success">
                ✓ Approve
              </button>
            )}
            {canReject() && (
              <button onClick={() => { setComments(''); setShowRejectModal(true); }} className="btn-danger">
                ✗ Reject
              </button>
            )}
            {canCancel() && (
              <button onClick={handleCancel} disabled={actionLoading} className="btn-secondary text-red-600 hover:bg-red-50">
                Cancel Request
              </button>
            )}
          </div>
        )}

        {request.status === 'rejected' && request.rejection_reason && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-800">Rejection Reason:</p>
            <p className="text-sm text-red-700 mt-1">{request.rejection_reason}</p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Problem Statement */}
          {request.problem && (
            <Section title="Problem Statement">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{request.problem}</p>
            </Section>
          )}

          {/* Proposed Solution */}
          {request.solution && (
            <Section title="Proposed Solution">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{request.solution}</p>
            </Section>
          )}

          {/* Request Details */}
          <Section title="Request Details">
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{request.description}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Business Justification</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{request.justification}</dd>
              </div>
              <InfoRow label="Business Case / Benefits" value={request.business_case} />
              <InfoRow label="Expected ROI" value={request.expected_roi} />
              <InfoRow label="Preferred Vendor" value={request.vendor} />
            </dl>
          </Section>

          {/* Bids */}
          <BidsTable bids={bids} />

          {/* Photos */}
          <PhotosGallery photos={photos} />

          {/* Request Info */}
          <Section title="Request Info">
            <dl className="grid grid-cols-2 gap-4">
              <InfoRow label="Submitted By" value={request.requester_name} />
              <InfoRow label="Department" value={request.department} />
              <InfoRow label="Category" value={request.category} />
              <InfoRow label="Priority" value={request.priority ? request.priority.charAt(0).toUpperCase() + request.priority.slice(1) : null} />
              <InfoRow label="Created" value={formatDate(request.created_at)} />
              <InfoRow label="Last Updated" value={formatDate(request.updated_at)} />
            </dl>
          </Section>
        </div>

        {/* Right column: timeline */}
        <div className="card h-fit">
          <ApprovalTimeline
            actions={request.actions || []}
            status={request.status}
            amount={request.amount}
          />
        </div>
      </div>

      {/* Approve modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowApproveModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Approve Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              You are approving: <strong>{request.title}</strong> ({formatCurrency(request.amount)})
            </p>
            <div>
              <label className="form-label">Comments (optional)</label>
              <textarea value={comments} onChange={e => setComments(e.target.value)}
                rows={3} className="form-textarea" placeholder="Add any comments or conditions…" />
            </div>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowApproveModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleApprove} disabled={actionLoading} className="btn-success flex-1">
                {actionLoading ? 'Approving…' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              You are rejecting: <strong>{request.title}</strong> ({formatCurrency(request.amount)})
            </p>
            <div>
              <label className="form-label">Rejection Reason *</label>
              <textarea value={comments} onChange={e => setComments(e.target.value)}
                rows={4} className="form-textarea" placeholder="Provide a clear reason for rejection…" />
            </div>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRejectModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleReject} disabled={actionLoading} className="btn-danger flex-1">
                {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
