'use client';

import { useEffect } from 'react';

interface SuccessAlertProps {
  message: string;
  isVisible: boolean;
  onClose: () => void; // Function to call when the alert should close
}

const SuccessAlert: React.FC<SuccessAlertProps> = ({
  message,
  isVisible,
  onClose,
}) => {
  // Automatically hide the alert after a few seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Hide after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) {
    return null; // Don't render if not visible
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-500 dark:bg-green-200 dark:text-green-800 shadow-lg" role="alert">
      {/* Simple checkmark icon - replace with an actual SVG if using an icon library */}
      <svg className="flex-shrink-0 inline w-4 h-4 me-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
      </svg>
      <span className="sr-only">Success</span>
      <div>
        <span className="font-medium">Success!</span> {message}
      </div>
      {/* Close button (optional, as it auto-hides) */}
      {/* <button type="button" className="ms-auto -mx-1.5 -my-1.5 bg-green-50 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 p-1.5 hover:bg-green-200 inline-flex items-center justify-center h-8 w-8 dark:bg-gray-700 dark:text-green-400 dark:hover:bg-gray-600" data-dismiss-target="#alert-3" aria-label="Close" onClick={onClose}>*/}
      {/*   <span className="sr-only">Close</span> */}
      {/*   <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14"> */}
      {/*     <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 6 6-6M7 7l6-6M7 7l-6 6"/> */}
      {/*   </svg> */}
      {/* </button> */}
    </div>
  );
};

export default SuccessAlert; 