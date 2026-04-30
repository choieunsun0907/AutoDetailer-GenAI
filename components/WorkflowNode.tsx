import React from 'react';
import { LucideIcon, CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';
import { WorkflowStatus } from '../types';

interface WorkflowNodeProps {
  title: string;
  icon: LucideIcon;
  status: 'pending' | 'active' | 'completed' | 'error';
  description?: string;
}

const WorkflowNode: React.FC<WorkflowNodeProps> = ({ title, icon: Icon, status, description }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active': return 'border-blue-500 bg-blue-500/10 text-blue-400';
      case 'completed': return 'border-green-500 bg-green-500/10 text-green-400';
      case 'error': return 'border-red-500 bg-red-500/10 text-red-400';
      default: return 'border-slate-700 bg-slate-800 text-slate-500';
    }
  };

  return (
    <div className={`relative flex items-center p-4 border rounded-lg transition-all duration-300 ${getStatusColor()}`}>
      <div className="mr-4">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-sm uppercase tracking-wider">{title}</h3>
        {description && <p className="text-xs opacity-80 mt-1">{description}</p>}
      </div>
      <div className="ml-4">
        {status === 'completed' && <CheckCircle2 className="w-5 h-5" />}
        {status === 'active' && <Loader2 className="w-5 h-5 animate-spin" />}
        {status === 'pending' && <CircleDashed className="w-5 h-5 opacity-50" />}
      </div>
    </div>
  );
};

export default WorkflowNode;