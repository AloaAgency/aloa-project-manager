'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Clock,
  FileText,
  Link,
  Upload,
  Users,
  Calendar,
  Milestone,
  Lock,
  ChevronRight
} from 'lucide-react';

const STEP_TYPE_ICONS = {
  form: FileText,
  link: Link,
  upload: Upload,
  approval: CheckCircle,
  content: FileText,
  meeting: Users,
  milestone: Milestone
};

export default function ProjectletStepsClient({ 
  projectId, 
  projectletId,
  projectletStatus,
  onStepClick 
}) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectletId) {
      fetchSteps();
    }
  }, [projectletId]);

  const fetchSteps = async () => {
    try {
      const response = await fetch(`/api/aloa-projects/${projectId}/projectlets/${projectletId}/steps`);
      const data = await response.json();
      setSteps(data.steps || []);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500 mt-4 ml-16">
        Loading steps...
      </div>
    );
  }

  if (steps.length === 0) {
    return null;
  }

  const completedSteps = steps.filter(s => s.status === 'completed' && s.is_required).length;
  const totalRequired = steps.filter(s => s.is_required).length;
  const progressPercentage = totalRequired > 0 ? (completedSteps / totalRequired) * 100 : 0;

  return (
    <div className="mt-4 ml-16">
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span className="font-semibold">
            {completedSteps}/{totalRequired} required steps
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="h-full bg-green-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const Icon = STEP_TYPE_ICONS[step.type] || FileText;
          const isClickable = projectletStatus !== 'completed' && projectletStatus !== 'locked';

          return (
            <div 
              key={step.id}
              onClick={() => isClickable && onStepClick && onStepClick(step)}
              className={`
                flex items-center justify-between p-3 rounded-lg border transition-all
                ${step.status === 'completed' 
                  ? 'bg-green-50 border-green-200' 
                  : step.status === 'in_progress'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-white border-gray-200'
                }
                ${isClickable && step.status !== 'completed' ? 'cursor-pointer hover:shadow-md' : ''}
              `}
            >
              <div className="flex items-center flex-1">
                <div className="mr-3">
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : step.status === 'in_progress' ? (
                    <Clock className="w-5 h-5 text-yellow-600" />
                  ) : projectletStatus === 'completed' ? (
                    <Lock className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center">
                    <Icon className="w-4 h-4 mr-2 text-gray-600" />
                    <span className={`font-medium ${
                      step.status === 'completed' ? 'text-green-700' : 'text-gray-900'
                    }`}>
                      {step.name}
                    </span>
                    {step.is_required && (
                      <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-sm text-gray-600 mt-0.5">{step.description}</p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              {isClickable && step.status !== 'completed' && (
                <div className="ml-3">
                  {step.type === 'form' && step.form_id ? (
                    <button className="text-sm bg-black text-white px-3 py-1 rounded-lg hover:bg-gray-800 flex items-center">
                      Open Form
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </button>
                  ) : step.type === 'link' && step.link_url ? (
                    <button className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 flex items-center">
                      View Link
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </button>
                  ) : step.type === 'approval' ? (
                    <button className="text-sm bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 flex items-center">
                      Review
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </button>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              )}

              {/* Completed Badge */}
              {step.status === 'completed' && (
                <div className="ml-3 text-sm text-green-600 font-medium">
                  ✓ Done
                </div>
              )}

              {/* Locked Message */}
              {projectletStatus === 'completed' && step.status !== 'completed' && (
                <div className="ml-3 text-sm text-gray-500">
                  Projectlet completed
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion Message */}
      {projectletStatus === 'completed' && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center text-green-700">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-semibold">Projectlet Completed!</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            This projectlet has been marked as complete and cannot be reopened.
          </p>
        </div>
      )}
    </div>
  );
}