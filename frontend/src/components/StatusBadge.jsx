import React from 'react';

const STATUS_CONFIG = {
  draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-700' },
  pending_manager: { label: 'Pending Manager', classes: 'bg-yellow-100 text-yellow-800' },
  pending_finance: { label: 'Pending Finance', classes: 'bg-blue-100 text-blue-800' },
  pending_executive: { label: 'Pending Executive', classes: 'bg-purple-100 text-purple-800' },
  approved: { label: 'Approved', classes: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', classes: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', classes: 'bg-gray-100 text-gray-500' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', classes: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', classes: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', classes: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical', classes: 'bg-red-100 text-red-700' },
};

export function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, classes: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const config = PRIORITY_CONFIG[priority] || { label: priority, classes: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  );
}
