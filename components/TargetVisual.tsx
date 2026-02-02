import React from 'react';

const TargetVisual: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-800/40 rounded-xl border border-dashed border-gray-700 mt-6 max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Detection Pattern</span>
      </div>
      
      {/* The Game Over Screen Replica */}
      <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden flex flex-col items-center pt-6 shadow-2xl ring-1 ring-white/10 group cursor-help">
        
        {/* Background Hint */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-700 via-gray-900 to-black"></div>
        
        {/* Blue Ribbon Container */}
        <div className="relative z-10 transform transition-transform group-hover:scale-105 duration-300">
            {/* Main Blue Bar */}
            <div className="bg-blue-600 h-10 w-48 flex items-center justify-between px-4 shadow-lg relative z-20">
                <span className="text-white font-bold text-2xl font-sans drop-shadow-md">27</span>
                <div className="flex gap-1">
                    <div className="w-5 h-5 bg-yellow-400 rounded-full shadow-sm border border-yellow-500 flex items-center justify-center text-[10px] text-yellow-700">★</div>
                    <div className="w-5 h-5 bg-yellow-400 rounded-full shadow-sm border border-yellow-500 flex items-center justify-center text-[10px] text-yellow-700">★</div>
                    <div className="w-5 h-5 bg-gray-800 rounded-full shadow-inner border border-gray-700"></div>
                </div>
            </div>
            
            {/* Ribbon Ends (Left) */}
            <div className="absolute top-2 -left-3 h-10 w-6 bg-blue-800 transform -skew-y-12 -z-10 rounded-l-sm"></div>
            <div className="absolute top-0 -left-1 h-3 w-4 bg-blue-900 transform skew-y-12 z-0"></div>

            {/* Ribbon Ends (Right) */}
            <div className="absolute top-2 -right-3 h-10 w-6 bg-blue-800 transform skew-y-12 -z-10 rounded-r-sm"></div>
            <div className="absolute top-0 -right-1 h-3 w-4 bg-blue-900 transform -skew-y-12 z-0"></div>
        </div>
        
        {/* Green Replay Button */}
        <div className="relative z-10 mt-3 group-hover:translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 bg-gradient-to-b from-green-600 to-green-700 rounded-lg border-b-4 border-green-900 shadow-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </div>
        </div>

        {/* Hover Tooltip */}
        <div className="absolute bottom-2 inset-x-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <span className="text-[10px] bg-black/80 px-2 py-1 rounded text-gray-300">AI looks for these elements</span>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 mt-3 text-center leading-relaxed">
        The program waits for this exact screen layout to determine the final score and end the recording session.
      </p>
    </div>
  );
};

export default TargetVisual;