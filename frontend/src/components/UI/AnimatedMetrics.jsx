import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const AnimatedMetrics = ({ title, value, previousValue, icon: Icon, color, format, suffix = '' }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const duration = 2000; // 2 segundos
    const steps = 60;
    const stepValue = value / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setAnimatedValue(Math.min(stepValue * currentStep, value));

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedValue(value);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const change = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
  const isPositive = change >= 0;

  const formatValue = (val) => {
    if (format === 'currency') {
      return `€${Math.round(val).toLocaleString()}`;
    } else if (format === 'percentage') {
      return `${val.toFixed(1)}%`;
    } else if (format === 'time') {
      return `${Math.round(val)}${suffix}`;
    }
    return Math.round(val).toLocaleString() + suffix;
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 border border-gray-100 transform transition-all duration-700 ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2 font-mono">
            {formatValue(animatedValue)}
          </p>

          {previousValue && (
            <div className="flex items-center">
              <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                isPositive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
              </div>
              <span className="text-xs text-gray-500 ml-2">vs. anterior</span>
            </div>
          )}
        </div>

        <div className={`p-4 rounded-xl ${color} transform transition-transform duration-300 hover:scale-110`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
};

export default AnimatedMetrics;