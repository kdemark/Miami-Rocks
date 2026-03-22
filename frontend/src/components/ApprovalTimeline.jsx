import React from 'react';

const STEP_LABELS = {
  submission: 'Submitted',
  manager: 'Manager Review',
  finance: 'Finance Review',
  executive: 'Executive Approval',
};

const ACTION_ICONS = {
  submitted: '📤',
  approved: '✅',
  rejected: '❌',
  info_requested: '❓',
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function ApprovalTimeline({ actions, status, amount }) {
  const EXECUTIVE_THRESHOLD = 50000;
  const steps = ['submission', 'manager', 'finance'];
  if (amount >= EXECUTIVE_THRESHOLD) steps.push('executive');

  const actionsByStep = {};
  actions.forEach(a => {
    if (!actionsByStep[a.step]) actionsByStep[a.step] = [];
    actionsByStep[a.step].push(a);
  });

  const getStepStatus = (step) => {
    const stepActions = actionsByStep[step] || [];
    if (stepActions.length === 0) return 'pending';
    const last = stepActions[stepActions.length - 1];
    if (last.action === 'rejected') return 'rejected';
    if (last.action === 'approved' || last.action === 'submitted') return 'completed';
    return 'in_progress';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Approval Timeline</h3>
      <div className="relative">
        {steps.map((step, idx) => {
          const stepStatus = getStepStatus(step);
          const stepActions = actionsByStep[step] || [];

          return (
            <div key={step} className="relative flex gap-4 pb-6 last:pb-0">
              {idx < steps.length - 1 && (
                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200" />
              )}
              <div className={`relative flex-none w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 ${
                stepStatus === 'completed' ? 'bg-green-500 text-white' :
                stepStatus === 'rejected' ? 'bg-red-500 text-white' :
                stepStatus === 'in_progress' ? 'bg-blue-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {stepStatus === 'completed' ? '✓' : stepStatus === 'rejected' ? '✗' : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${
                    stepStatus === 'completed' ? 'text-green-700' :
                    stepStatus === 'rejected' ? 'text-red-700' :
                    stepStatus === 'in_progress' ? 'text-blue-700' :
                    'text-gray-500'
                  }`}>
                    {STEP_LABELS[step]}
                  </p>
                  {stepStatus === 'pending' && (
                    <span className="text-xs text-gray-400">Waiting</span>
                  )}
                </div>
                {stepActions.map((action) => (
                  <div key={action.id} className="mt-2 p-3 bg-gray-50 rounded-lg text-sm border border-gray-100">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-800">
                        {ACTION_ICONS[action.action]} {action.approver_name}
                        <span className="ml-1 text-xs font-normal text-gray-500 capitalize">({action.approver_role})</span>
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(action.created_at)}</span>
                    </div>
                    {action.comments && (
                      <p className="mt-1 text-gray-600 italic">"{action.comments}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
