import React from 'react';
import { CheckCircle, Circle, Clock } from 'lucide-react';

const ProgressIndicator = ({ steps, currentStep, variant = 'default' }) => {
  const getStepStatus = (stepIndex) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'pending';
  };

  const getStepColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600 border-green-600 text-white';
      case 'current':
        return 'bg-blue-600 border-blue-600 text-white';
      case 'pending':
        return 'bg-gray-200 border-gray-200 text-gray-500';
      default:
        return 'bg-gray-200 border-gray-200 text-gray-500';
    }
  };

  const getConnectorColor = (stepIndex) => {
    if (stepIndex < currentStep) return 'bg-green-600';
    return 'bg-gray-200';
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-2">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          return (
            <React.Fragment key={index}>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full border-2 ${getStepColor(status)}`} />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${getConnectorColor(index)}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const Icon = status === 'completed' ? CheckCircle :
                      status === 'current' ? Clock : Circle;

          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center">
                {/* Step Circle */}
                <div className={`
                  w-12 h-12 rounded-full border-2 flex items-center justify-center
                  transition-all duration-300 transform hover:scale-105
                  ${getStepColor(status)}
                  ${status === 'current' ? 'ring-4 ring-blue-200 ring-opacity-50' : ''}
                `}>
                  {status === 'completed' ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : status === 'current' ? (
                    <Clock className="w-6 h-6 animate-pulse" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Step Info */}
                <div className="mt-3 text-center max-w-24">
                  <p className={`text-sm font-medium ${
                    status === 'current' ? 'text-blue-600' :
                    status === 'completed' ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-400 mt-1">
                      {step.description}
                    </p>
                  )}
                  {step.estimatedTime && status !== 'completed' && (
                    <p className="text-xs text-blue-500 mt-1">
                      ~{step.estimatedTime}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 flex items-center">
                  <div className={`
                    h-0.5 flex-1 transition-all duration-500
                    ${getConnectorColor(index)}
                  `} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progreso</span>
          <span>{Math.round((currentStep / (steps.length - 1)) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-700 ease-in-out"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;