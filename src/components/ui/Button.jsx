import React from 'react';
import { cn } from '../../lib/utils';
import SafeIcon from '../../common/SafeIcon';

export const Button = ({ children, variant = 'primary', size = 'md', className, icon, isLoading, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:pointer-events-none shadow-sm";
  
  const variants = {
    // Uses the 'primary' color defined in tailwind.config.js which maps to var(--color-primary)
    primary: "bg-primary text-white hover:brightness-90 active:brightness-75",
    secondary: "bg-gray-100 text-gray-900 border border-gray-200 hover:bg-gray-200",
    outline: "border-2 border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700 hover:text-gray-900",
    // Darker red for better contrast (red-600)
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
  };

  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-11 px-5 py-2.5 text-base", // Slightly larger for better touch targets
    lg: "h-14 px-8 text-lg",
    icon: "h-10 w-10"
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin mr-2">⏳</span>
      ) : icon ? (
        <SafeIcon icon={icon} className={children ? "mr-2" : ""} />
      ) : null}
      {children}
    </button>
  );
};